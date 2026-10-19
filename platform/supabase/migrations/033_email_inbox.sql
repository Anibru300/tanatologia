-- 033_email_inbox.sql — Bandeja de entrada del correo oficial en el panel admin.
--
-- Los correos que llegan a hola@somos-calma.com se reenvían (Hostinger) a
-- inbound.somos-calma.com (Resend Inbound) y de ahí al webhook de la Edge
-- Function `inbound-email`, que inserta aquí cada mensaje (idempotente por
-- Message-ID) y notifica in-app a los admins. Las respuestas salen desde el
-- panel vía la Edge Function `inbox-reply` (Resend) con headers In-Reply-To/
-- References para conservar el hilo en los clientes de correo.
--
-- Escritura: únicamente service role (las Edge Functions). Lectura/UPDATE
-- (leído/no leído): solo rol admin (misma política que email_broadcasts).
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/033_email_inbox.sql
--
-- Requiere desplegadas las Edge Functions: inbound-email, inbox-reply.
-- Pendiente manual del dueño: ruta inbound en Resend, MX del subdominio
-- `inbound` en DNS de Hostinger y reenvío de hola@ en hPanel (ver AGENTS.md).
BEGIN;

-- =============================================================================
-- 1. Tabla de la bandeja (entrada y salida en la misma tabla; el hilo se
--    enlaza con thread_root_id + message_id / in_reply_to / references)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  message_id TEXT,                -- header Message-ID (threading + idempotencia de entrada)
  in_reply_to TEXT,               -- header In-Reply-To del mensaje al que responde
  refs TEXT[] NOT NULL DEFAULT '{}',        -- header References acumulado ("references" es palabra reservada)
  thread_root_id UUID REFERENCES public.email_inbox(id) ON DELETE SET NULL,
  attachments JSONB NOT NULL DEFAULT '[]',  -- [{name, size, content_type, path}]
  is_read BOOLEAN NOT NULL DEFAULT false,   -- solo aplica a direction='in'
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_inbox_received ON public.email_inbox(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_inbox_thread ON public.email_inbox(thread_root_id, received_at);

-- Idempotencia del webhook de Resend: mismo Message-ID no se inserta dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS email_inbox_message_id_in
  ON public.email_inbox(message_id) WHERE direction = 'in' AND message_id IS NOT NULL;

ALTER TABLE public.email_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read inbox" ON public.email_inbox;
CREATE POLICY "Admin read inbox" ON public.email_inbox
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin update inbox" ON public.email_inbox;
CREATE POLICY "Admin update inbox" ON public.email_inbox
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Sin política INSERT para autenticados/anon: la escritura es únicamente
-- service role (Edge Functions inbound-email / inbox-reply).

-- Realtime: la página /admin/bandeja se suscribe a INSERTs para avisar
-- "Nuevo correo" en cuanto llega (RLS sigue aplicando a los suscriptores).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'email_inbox' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_inbox;
  END IF;
END $$;

-- =============================================================================
-- 2. Bucket privado de adjuntos (los sube la función inbound-email con service
--    role; el admin los descarga por signed URL). Lectura solo admin.
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('email-attachments', 'email-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin read email attachments" ON storage.objects;
CREATE POLICY "Admin read email attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'email-attachments' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manage email attachments" ON storage.objects;
CREATE POLICY "Admin manage email attachments" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'email-attachments' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'email-attachments' AND public.is_admin(auth.uid()));

-- Sin política INSERT para autenticados: la subida la hace la función (service role).

COMMIT;
