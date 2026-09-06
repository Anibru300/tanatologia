-- 019_email_notifications.sql — Correos transaccionales (bienvenida, cancelación,
-- verificación) + tabla de comunicados (broadcast) para el panel admin.
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/019_email_notifications.sql
--
-- Requiere desplegadas las Edge Functions: user-emails, send-broadcast.
-- pg_net difiere la petición HTTP hasta el COMMIT: el perfil/cita ya existe cuando
-- user-emails la recibe. El envío es best-effort: un fallo de correo NUNCA tumba
-- la operación de la base de datos (bloque EXCEPTION WHEN OTHERS).
BEGIN;

-- =============================================================================
-- 1. Tabla de comunicados (historial + contadores; la UI admin la llena/lee)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audience TEXT NOT NULL CHECK (audience IN ('all', 'patients', 'professionals')),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  body_text TEXT NOT NULL CHECK (char_length(body_text) BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_created ON public.email_broadcasts(created_at DESC);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read broadcasts" ON public.email_broadcasts;
CREATE POLICY "Admin read broadcasts" ON public.email_broadcasts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin insert broadcasts" ON public.email_broadcasts;
CREATE POLICY "Admin insert broadcasts" ON public.email_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Admin update broadcasts" ON public.email_broadcasts;
CREATE POLICY "Admin update broadcasts" ON public.email_broadcasts
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- =============================================================================
-- 2. Helper: despacha un correo transaccional vía pg_net -> Edge Function user-emails
--    (best-effort; nunca lanza excepción hacia el llamador).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_user_email(p_type TEXT, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

    IF v_secret IS NULL THEN
      RAISE WARNING 'dispatch_user_email: CRON_SECRET no encontrado en vault';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/user-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object('type', p_type) || COALESCE(p_payload, '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_user_email (%): %', p_type, SQLERRM;
  END;
END;
$$;

-- =============================================================================
-- 3. Bienvenida: al crearse el perfil (handle_new_user), correo según rol.
--    Admin/support no reciben bienvenida de producto.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.welcome_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'patient' THEN
    PERFORM public.dispatch_user_email('welcome_patient', jsonb_build_object('profile_id', NEW.id));
  ELSIF NEW.role = 'professional' THEN
    PERFORM public.dispatch_user_email('welcome_professional', jsonb_build_object('profile_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS welcome_new_user ON public.profiles;
CREATE TRIGGER welcome_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.welcome_new_user();

-- =============================================================================
-- 4. Cancelación de cita: además de la notificación in-app al paciente,
--    avisar por correo a AMBAS partes.
-- =============================================================================
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

    IF NEW.status = 'cancelled' THEN
      PERFORM public.dispatch_user_email('appointment_cancelled', jsonb_build_object('appointment_id', NEW.id));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_appointment_events ON public.appointments;
CREATE TRIGGER notify_appointment_events
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_events();

-- =============================================================================
-- 5. Verificación del profesional: correo además de la notificación in-app
--    (in_review sigue solo in-app; verified/rejected son los momentos clave).
-- =============================================================================
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

    IF NEW.verification_status = 'verified' THEN
      PERFORM public.dispatch_user_email('verification_verified', jsonb_build_object('profile_id', NEW.profile_id));
    ELSIF NEW.verification_status = 'rejected' THEN
      PERFORM public.dispatch_user_email('verification_rejected', jsonb_build_object('profile_id', NEW.profile_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_verification_events ON public.professional_profiles;
CREATE TRIGGER notify_verification_events
  AFTER UPDATE OF verification_status ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_verification_events();

COMMIT;
