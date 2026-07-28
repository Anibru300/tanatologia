-- SOMOS-CALMA — Migración 005: Fase 1 (perfiles completos, verificación documental,
-- notificaciones, aceptaciones legales, preparación financiera y buckets de Storage).
-- Ejecutar en SQL Editor de Supabase Cloud después de 001-004.
--
-- Cambios principales:
-- 1. professional_profiles: columnas de verificación documental y datos profesionales.
-- 2. Tabla professional_documents (expediente de verificación).
-- 3. Tabla notifications (+ trigger de citas) habilitada para Realtime.
-- 4. Tabla legal_acceptances (T&C, aviso de privacidad, consentimientos).
-- 5. appointments: columnas financieras nullable (preparación para pagos, Fase 3).
-- 6. availability: política de lectura para pacientes (booking con horarios reales).
-- 7. Función submit_for_review() para que el profesional envíe su expediente.
-- 8. Buckets de Storage: avatars (público) y professional-documents (privado).
-- 9. Tabla platform_settings (configuración global editable por admin).

BEGIN;

-- =============================================================================
-- 1. professional_profiles: datos profesionales y verificación
-- =============================================================================
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS professional_title TEXT,        -- Lic. / Mtra. / Dra.
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{es}',
  ADD COLUMN IF NOT EXISTS years_experience INTEGER CHECK (years_experience IS NULL OR years_experience >= 0),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Sello de verificación automático: solo admin puede verificar (trigger 003 ya lo garantiza)
CREATE OR REPLACE FUNCTION public.stamp_professional_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
    NEW.verified_at := NOW();
    NEW.verified_by := auth.uid();
    NEW.rejection_reason := NULL;
  ELSIF NEW.verification_status = 'rejected' AND OLD.verification_status IS DISTINCT FROM 'rejected' THEN
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_professional_verification ON public.professional_profiles;
CREATE TRIGGER stamp_professional_verification
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_professional_verification();

-- =============================================================================
-- 2. Expediente documental del profesional
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.professional_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cedula', 'titulo', 'ine', 'comprobante_domicilio', 'constancia_fiscal', 'otro')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_documents_profile
  ON public.professional_documents(professional_profile_id, document_type);

ALTER TABLE public.professional_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals manage own documents" ON public.professional_documents;
CREATE POLICY "Professionals manage own documents" ON public.professional_documents
  FOR ALL USING (
    auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id)
  );

DROP POLICY IF EXISTS "Admins have full access on professional_documents" ON public.professional_documents;
CREATE POLICY "Admins have full access on professional_documents" ON public.professional_documents
  FOR ALL USING (public.is_admin(auth.uid()));

-- El profesional no puede auto-aprobar documentos
CREATE OR REPLACE FUNCTION public.enforce_document_review_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden revisar documentos';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_document_review_restrictions ON public.professional_documents;
CREATE TRIGGER enforce_document_review_restrictions
  BEFORE UPDATE ON public.professional_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_document_review_restrictions();

-- =============================================================================
-- 3. Función para enviar expediente a revisión (profesional -> in_review)
--    SECURITY DEFINER porque el trigger 003 impide al profesional tocar
--    verification_status directamente. Solo permite pending/rejected -> in_review.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.submit_for_review()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pp public.professional_profiles%ROWTYPE;
  v_doc_count INTEGER;
BEGIN
  SELECT * INTO v_pp FROM public.professional_profiles WHERE profile_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil profesional';
  END IF;

  IF v_pp.verification_status NOT IN ('pending', 'rejected', 'in_review') THEN
    RAISE EXCEPTION 'El perfil ya está verificado';
  END IF;

  IF v_pp.license_number IS NULL OR length(trim(v_pp.license_number)) < 4 THEN
    RAISE EXCEPTION 'Captura tu número de cédula profesional antes de enviar a revisión';
  END IF;

  SELECT COUNT(*) INTO v_doc_count
  FROM public.professional_documents
  WHERE professional_profile_id = v_pp.id
    AND document_type IN ('cedula', 'titulo', 'ine');

  IF v_doc_count < 3 THEN
    RAISE EXCEPTION 'Sube cédula, título e identificación oficial antes de enviar a revisión';
  END IF;

  UPDATE public.professional_profiles
  SET verification_status = 'in_review', rejection_reason = NULL
  WHERE id = v_pp.id;

  RETURN 'in_review';
END;
$$;

-- =============================================================================
-- 4. Notificaciones in-app
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
  ON public.notifications(profile_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Los usuarios leen y marcan como leídas solo sus notificaciones.
-- La inserción ocurre vía triggers SECURITY DEFINER (o service role), nunca desde el cliente.
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE USING (auth.uid() = profile_id);

-- Trigger: notificar al profesional cuando le agendan una cita,
-- y al paciente cuando cambia el estado de su cita.
CREATE OR REPLACE FUNCTION public.notify_appointment_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_professional_user UUID;
  v_patient_user UUID;
  v_professional_name TEXT;
BEGIN
  SELECT profile_id, full_name INTO v_professional_user, v_professional_name
  FROM public.professional_profiles WHERE id = COALESCE(NEW.professional_profile_id, OLD.professional_profile_id);

  SELECT profile_id INTO v_patient_user
  FROM public.patient_profiles WHERE id = COALESCE(NEW.patient_profile_id, OLD.patient_profile_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (profile_id, type, title, body, link)
    VALUES (
      v_professional_user,
      'appointment_created',
      'Nueva cita agendada',
      'Tienes una nueva cita programada para el ' || to_char(NEW.scheduled_at AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI'),
      '/profesional/citas'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (profile_id, type, title, body, link)
    VALUES (
      v_patient_user,
      'appointment_' || NEW.status,
      CASE NEW.status
        WHEN 'confirmed' THEN 'Tu cita fue confirmada'
        WHEN 'cancelled' THEN 'Tu cita fue cancelada'
        WHEN 'completed' THEN 'Tu sesión fue completada'
        ELSE 'Actualización de tu cita'
      END,
      'Con ' || COALESCE(v_professional_name, 'tu profesional') || ' — ' ||
        to_char(NEW.scheduled_at AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI'),
      '/paciente/citas'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_appointment_events ON public.appointments;
CREATE TRIGGER notify_appointment_events
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_events();

-- Notificar cambios de verificación al profesional
CREATE OR REPLACE FUNCTION public.notify_verification_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    INSERT INTO public.notifications (profile_id, type, title, body, link)
    VALUES (
      NEW.profile_id,
      'verification_' || NEW.verification_status,
      CASE NEW.verification_status
        WHEN 'verified' THEN '¡Tu perfil fue verificado!'
        WHEN 'rejected' THEN 'Tu verificación requiere cambios'
        WHEN 'in_review' THEN 'Tu expediente está en revisión'
        ELSE 'Actualización de verificación'
      END,
      CASE NEW.verification_status
        WHEN 'verified' THEN 'Ya eres visible en el directorio y puedes recibir citas.'
        WHEN 'rejected' THEN COALESCE('Motivo: ' || NEW.rejection_reason, 'Revisa tu expediente y vuelve a enviarlo.')
        ELSE 'Te avisaremos cuando un administrador lo revise.'
      END,
      '/profesional/verificacion'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_verification_events ON public.professional_profiles;
CREATE TRIGGER notify_verification_events
  AFTER UPDATE OF verification_status ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_verification_events();

-- Habilitar Realtime para notificaciones (campana en vivo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- =============================================================================
-- 5. Aceptaciones legales (T&C, aviso de privacidad, consentimientos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'terms', 'privacy_notice', 'sensitive_data_consent',
    'teletherapy_consent', 'service_agreement', 'commission_agreement',
    'cancellation_policy'
  )),
  document_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE (profile_id, document_type, document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_profile
  ON public.legal_acceptances(profile_id, document_type);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users read own legal acceptances" ON public.legal_acceptances
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users create own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users create own legal acceptances" ON public.legal_acceptances
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Admins read legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Admins read legal acceptances" ON public.legal_acceptances
  FOR SELECT USING (public.is_admin(auth.uid()));

-- =============================================================================
-- 6. appointments: columnas financieras (nullable, se llenan en Fase 3 - pagos)
-- =============================================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS price_centavos INTEGER CHECK (price_centavos IS NULL OR price_centavos >= 0),
  ADD COLUMN IF NOT EXISTS platform_fee_centavos INTEGER CHECK (platform_fee_centavos IS NULL OR platform_fee_centavos >= 0),
  ADD COLUMN IF NOT EXISTS payout_centavos INTEGER CHECK (payout_centavos IS NULL OR payout_centavos >= 0),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partially_refunded'));

-- Endurecer el trigger 003: pacientes tampoco pueden tocar las columnas financieras
CREATE OR REPLACE FUNCTION public.enforce_appointment_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := public.is_admin(auth.uid());
  v_is_patient BOOLEAN;
  v_is_professional BOOLEAN;
BEGIN
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  v_is_patient := EXISTS (
    SELECT 1 FROM public.patient_profiles
    WHERE id = NEW.patient_profile_id AND profile_id = auth.uid()
  );

  v_is_professional := EXISTS (
    SELECT 1 FROM public.professional_profiles
    WHERE id = NEW.professional_profile_id AND profile_id = auth.uid()
  );

  IF v_is_patient THEN
    IF NEW.status NOT IN ('pending', 'confirmed', 'cancelled') THEN
      RAISE EXCEPTION 'Paciente no puede cambiar el estado a %', NEW.status;
    END IF;

    IF NEW.patient_profile_id IS DISTINCT FROM OLD.patient_profile_id
       OR NEW.professional_profile_id IS DISTINCT FROM OLD.professional_profile_id
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
       OR NEW.session_type IS DISTINCT FROM OLD.session_type
       OR NEW.video_link IS DISTINCT FROM OLD.video_link
       OR NEW.price_centavos IS DISTINCT FROM OLD.price_centavos
       OR NEW.platform_fee_centavos IS DISTINCT FROM OLD.platform_fee_centavos
       OR NEW.payout_centavos IS DISTINCT FROM OLD.payout_centavos
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Paciente solo puede cancelar la cita o editar notas';
    END IF;

    RETURN NEW;
  END IF;

  IF v_is_professional THEN
    IF NEW.video_link IS DISTINCT FROM OLD.video_link THEN
      RAISE EXCEPTION 'No se permite modificar el enlace de videollamada';
    END IF;
    IF NEW.price_centavos IS DISTINCT FROM OLD.price_centavos
       OR NEW.platform_fee_centavos IS DISTINCT FROM OLD.platform_fee_centavos
       OR NEW.payout_centavos IS DISTINCT FROM OLD.payout_centavos
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Las columnas financieras solo las gestiona la plataforma';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No tienes permiso para actualizar esta cita';
END;
$$;

-- =============================================================================
-- 6b. Horarios ocupados de un profesional (para el booking)
--     RLS solo deja leer las citas propias; esta función expone ÚNICAMENTE
--     scheduled_at/duration/status de citas activas, sin datos del paciente.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  p_professional_profile_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (scheduled_at TIMESTAMPTZ, duration_minutes INTEGER, status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.scheduled_at, a.duration_minutes, a.status
  FROM public.appointments a
  WHERE a.professional_profile_id = p_professional_profile_id
    AND a.status IN ('pending', 'confirmed')
    AND a.scheduled_at >= p_start
    AND a.scheduled_at < p_end
  ORDER BY a.scheduled_at;
$$;

-- =============================================================================
-- 7. availability: lectura pública de horarios de profesionales verificados
--    (necesaria para que el booking muestre solo horarios reales)
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated read verified availability" ON public.availability;
CREATE POLICY "Authenticated read verified availability" ON public.availability
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_profile_id
        AND pp.verification_status = 'verified'
        AND pp.is_visible = true
    )
  );

-- =============================================================================
-- 8. Configuración global de la plataforma (precios, comisiones, textos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings
  FOR ALL USING (public.is_admin(auth.uid()));

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_percent', '20', 'Comisión de la plataforma sobre cada sesión (%)'),
  ('session_duration_minutes', '50', 'Duración estándar de sesión'),
  ('cancellation_window_hours', '24', 'Horas mínimas para cancelar sin cargo'),
  ('legal_versions', '{"terms": "1.0", "privacy_notice": "1.0", "sensitive_data_consent": "1.0", "teletherapy_consent": "1.0"}', 'Versiones vigentes de documentos legales')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 9. Buckets de Storage
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('professional-documents', 'professional-documents', false, 10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- avatars: lectura pública; escritura solo en carpeta propia (<profile_id>/...)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- professional-documents: privado; profesional escribe en su carpeta, admin lee todo
DROP POLICY IF EXISTS "Professionals upload own documents" ON storage.objects;
CREATE POLICY "Professionals upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'professional-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Professionals read own documents" ON storage.objects;
CREATE POLICY "Professionals read own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'professional-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Professionals delete own documents" ON storage.objects;
CREATE POLICY "Professionals delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'professional-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins read all professional documents" ON storage.objects;
CREATE POLICY "Admins read all professional documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'professional-documents'
    AND public.is_admin(auth.uid())
  );

COMMIT;
