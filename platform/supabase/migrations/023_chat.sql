-- 023_chat.sql — Mensajería paciente↔profesional con adjuntos y moderación.
--
-- - conversations: un hilo por par paciente/profesional (UNIQUE). Solo puede
--   existir si hay al menos una cita no cancelada entre ambos (can_chat).
-- - messages: texto + adjunto (imagen/PDF, máx. 10 MB en bucket privado
--   chat-attachments). Escritura SOLO vía RPCs SECURITY DEFINER (send_message);
--   el cliente nunca inserta directo (RLS sin políticas de escritura).
-- - Moderación silenciosa: admin lee todo (RLS) y puede marcar mensajes
--   eliminados vía moderate_message() sin que los participantes sepan quién.
-- - Realtime: solo conversations (metadatos: last_message_at). Los mensajes
--   NO se publican: su contenido viaja por WAL y Realtime no aplica RLS al
--   broadcast. Al llegar un evento, el cliente refetchea por REST (RLS sí
--   protege esa lectura).
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/023_chat.sql
BEGIN;

-- =============================================================================
-- 1. Tablas
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_unique_pair UNIQUE (patient_profile_id, professional_profile_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '' CHECK (char_length(content) <= 2000),
  attachment_path TEXT CHECK (attachment_path IS NULL OR attachment_path ~ '^[0-9a-f-]{36}/'),
  attachment_name TEXT CHECK (attachment_name IS NULL OR char_length(attachment_name) <= 255),
  attachment_size INTEGER CHECK (attachment_size IS NULL OR attachment_size BETWEEN 1 AND 10485760),
  attachment_mime TEXT CHECK (attachment_mime IS NULL OR attachment_mime IN (
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  )),
  deleted_by_moderation BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un mensaje debe tener texto o adjunto
  CONSTRAINT messages_content_or_attachment CHECK (
    char_length(content) > 0 OR attachment_path IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient ON public.conversations(patient_profile_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_professional ON public.conversations(professional_profile_id, last_message_at DESC);

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_chat_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_chat_updated_at();

-- =============================================================================
-- 2. Helpers SECURITY DEFINER (evitan recursión RLS)
-- =============================================================================
-- IDs de subperfiles Y de usuarios (profiles.id) de una conversación
CREATE OR REPLACE FUNCTION public.conversation_participants(p_conversation_id UUID)
RETURNS TABLE(
  patient_profile_id UUID,
  professional_profile_id UUID,
  patient_user_id UUID,
  professional_user_id UUID
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.patient_profile_id,
    c.professional_profile_id,
    pp_p.profile_id,
    pp_pr.profile_id
  FROM public.conversations c
  JOIN public.patient_profiles pp_p ON pp_p.id = c.patient_profile_id
  JOIN public.professional_profiles pp_pr ON pp_pr.id = c.professional_profile_id
  WHERE c.id = p_conversation_id;
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants(p_conversation_id) cp
    WHERE cp.patient_user_id = auth.uid() OR cp.professional_user_id = auth.uid()
  );
$$;

-- ¿Existe al menos una cita NO cancelada entre paciente y profesional?
CREATE OR REPLACE FUNCTION public.can_chat(
  p_patient_profile_id UUID,
  p_professional_profile_id UUID
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_profile_id = p_patient_profile_id
      AND a.professional_profile_id = p_professional_profile_id
      AND a.status <> 'cancelled'
  );
$$;

-- =============================================================================
-- 3. RPCs (única vía de escritura)
-- =============================================================================
-- Inicia (o devuelve) la conversación con un contrario. El parámetro es el
-- profiles.id del otro (funciona para paciente y para profesional).
CREATE OR REPLACE FUNCTION public.start_conversation(p_counterparty_profile_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_my_role TEXT;
  v_patient_profile_id UUID;
  v_professional_profile_id UUID;
  v_conversation_id UUID;
BEGIN
  SELECT role INTO v_my_role FROM public.profiles WHERE id = auth.uid();
  IF v_my_role IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;

  IF v_my_role = 'patient' THEN
    SELECT id INTO v_patient_profile_id FROM public.patient_profiles WHERE profile_id = auth.uid();
    SELECT id INTO v_professional_profile_id FROM public.professional_profiles
      WHERE profile_id = p_counterparty_profile_id;
  ELSIF v_my_role = 'professional' THEN
    SELECT id INTO v_professional_profile_id FROM public.professional_profiles WHERE profile_id = auth.uid();
    SELECT id INTO v_patient_profile_id FROM public.patient_profiles
      WHERE profile_id = p_counterparty_profile_id;
  ELSE
    RAISE EXCEPTION 'Solo pacientes y profesionales pueden chatear';
  END IF;

  IF v_patient_profile_id IS NULL OR v_professional_profile_id IS NULL THEN
    RAISE EXCEPTION 'Contrario no encontrado';
  END IF;

  IF NOT public.can_chat(v_patient_profile_id, v_professional_profile_id) THEN
    RAISE EXCEPTION 'Solo puedes chatear con usuarios con quienes tienes una cita';
  END IF;

  INSERT INTO public.conversations (patient_profile_id, professional_profile_id)
  VALUES (v_patient_profile_id, v_professional_profile_id)
  ON CONFLICT (patient_profile_id, professional_profile_id) DO NOTHING;

  SELECT id INTO v_conversation_id FROM public.conversations
  WHERE patient_profile_id = v_patient_profile_id
    AND professional_profile_id = v_professional_profile_id;

  RETURN v_conversation_id;
END;
$$;

-- Envía un mensaje. Solo participantes. Crea la notificación in-app al otro.
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_attachment_path TEXT DEFAULT NULL,
  p_attachment_name TEXT DEFAULT NULL,
  p_attachment_size INTEGER DEFAULT NULL,
  p_attachment_mime TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cp RECORD;
  v_message_id UUID;
  v_snippet TEXT;
  v_link TEXT;
  v_sender_name TEXT;
BEGIN
  SELECT * INTO cp FROM public.conversation_participants(p_conversation_id);
  IF cp.patient_user_id IS NULL THEN RAISE EXCEPTION 'Conversación no encontrada'; END IF;

  IF auth.uid() <> cp.patient_user_id AND auth.uid() <> cp.professional_user_id THEN
    RAISE EXCEPTION 'No eres participante de esta conversación';
  END IF;

  IF p_attachment_path IS NOT NULL
     AND p_attachment_path NOT LIKE (p_conversation_id::text || '/%') THEN
    RAISE EXCEPTION 'Adjunto inválido';
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_profile_id, content,
    attachment_path, attachment_name, attachment_size, attachment_mime
  ) VALUES (
    p_conversation_id, auth.uid(), COALESCE(p_content, ''),
    p_attachment_path, p_attachment_name, p_attachment_size, p_attachment_mime
  ) RETURNING id INTO v_message_id;

  UPDATE public.conversations SET last_message_at = NOW() WHERE id = p_conversation_id;

  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = auth.uid();
  v_snippet := left(trim(COALESCE(p_content, '')), 120);
  IF v_snippet = '' THEN v_snippet := 'Te envió un archivo'; END IF;
  v_link := CASE WHEN auth.uid() = cp.patient_user_id
    THEN '/profesional/mensajes'
    ELSE '/paciente/mensajes' END;

  INSERT INTO public.notifications (profile_id, type, title, body, link)
  VALUES (
    CASE WHEN auth.uid() = cp.patient_user_id
      THEN cp.professional_user_id
      ELSE cp.patient_user_id END,
    'chat_message',
    'Nuevo mensaje de ' || COALESCE(v_sender_name, 'un usuario'),
    v_snippet,
    v_link
  );

  RETURN v_message_id;
END;
$$;

-- Marca como leídos los mensajes del otro participante
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'No eres participante de esta conversación';
  END IF;
  UPDATE public.messages SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_profile_id <> auth.uid()
    AND read_at IS NULL;
END;
$$;

-- Moderación silenciosa: solo admin. Marca el mensaje y audita.
CREATE OR REPLACE FUNCTION public.moderate_message(p_message_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden moderar mensajes';
  END IF;
  UPDATE public.messages SET deleted_by_moderation = true WHERE id = p_message_id;
  INSERT INTO public.audit_logs (profile_id, action, table_name, record_id)
  VALUES (auth.uid(), 'moderate_message', 'messages', p_message_id);
END;
$$;

-- =============================================================================
-- 4. RLS: lectura solo participante o admin; escritura solo por RPC
-- =============================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read conversations" ON public.conversations;
CREATE POLICY "Read conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_conversation_participant(id)
  );

DROP POLICY IF EXISTS "Read messages" ON public.messages;
CREATE POLICY "Read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_conversation_participant(conversation_id)
  );

-- (Sin políticas INSERT/UPDATE/DELETE: los RPCs SECURITY DEFINer las
--  ejecutan por fuera del RLS; el acceso directo del cliente queda negado.)

-- =============================================================================
-- 5. Realtime (SOLO metadatos de conversations; nunca contenido de messages)
-- =============================================================================
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

-- =============================================================================
-- 6. Bucket privado de adjuntos (imágenes + PDF, 10 MB por archivo)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Subida: el primer segmento del path ES el UUID de la conversación y el
-- usuario debe ser participante de ella.
DROP POLICY IF EXISTS "Chat participants upload attachments" ON storage.objects;
CREATE POLICY "Chat participants upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

-- Lectura: participante o admin (signed URLs)
DROP POLICY IF EXISTS "Chat participants read attachments" ON storage.objects;
CREATE POLICY "Chat participants read attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      public.is_admin(auth.uid())
      OR public.is_conversation_participant((storage.foldername(name))[1]::uuid)
    )
  );

-- Admin: control total del bucket (moderación de adjuntos)
DROP POLICY IF EXISTS "Admin manage chat attachments" ON storage.objects;
CREATE POLICY "Admin manage chat attachments" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'chat-attachments' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'chat-attachments' AND public.is_admin(auth.uid()));

COMMIT;
