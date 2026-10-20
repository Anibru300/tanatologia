-- 034_whatsapp_notifications.sql — Avisos de cita por WhatsApp (Meta Cloud API).
--
-- Añade el canal WhatsApp en paralelo al correo para 4 eventos: cita agendada,
-- recordatorio 24h, recordatorio 15min y cita cancelada. SOLO se envía a usuarios
-- con whatsapp_opt_in = true y teléfono válido (normalización a E.164 en la
-- Edge Function whatsapp-notify).
--
-- Degradación elegante: sin los secrets WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID,
-- la función responde 501 y todo el sistema sigue operando igual que antes
-- (correo + notificación in-app). Esta migración es inofensiva sin esos secrets.
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/034_whatsapp_notifications.sql
-- Requiere desplegada la Edge Function: whatsapp-notify.
BEGIN;

-- =============================================================================
-- 1. Opt-in explícito por usuario (default OFF: nadie recibe WhatsApp sin
--    activarlo en el registro o en Configuración de la cuenta).
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

-- =============================================================================
-- 2. Helper: despacha un aviso WhatsApp vía pg_net -> Edge Function
--    whatsapp-notify (best-effort; nunca lanza excepción hacia el llamador).
--    Mismo patrón que dispatch_user_email (019/021): pg_net difiere la petición
--    HTTP hasta el COMMIT.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_whatsapp(p_type TEXT, p_payload JSONB)
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
      RAISE WARNING 'dispatch_whatsapp: CRON_SECRET no encontrado en vault';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/whatsapp-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object('type', p_type) || COALESCE(p_payload, '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_whatsapp (%): %', p_type, SQLERRM;
  END;
END;
$$;

-- =============================================================================
-- 3. Eventos de cita: conservar la lógica existente (notificación in-app +
--    correo de cancelación vía dispatch_user_email) y AGREGAR el despacho
--    WhatsApp en dos momentos:
--      - INSERT (cita nueva): 'appointment_booked'
--      - UPDATE a 'cancelled': 'appointment_cancelled'
--    WhatsApp es best-effort y con opt-in; el correo sigue siendo el canal
--    garantizado.
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

    IF NEW.status IN ('pending', 'confirmed') THEN
      PERFORM public.dispatch_whatsapp('appointment_booked', jsonb_build_object('appointment_id', NEW.id));
    END IF;

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
      PERFORM public.dispatch_whatsapp('appointment_cancelled', jsonb_build_object('appointment_id', NEW.id));
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
-- 4. Registro: guardar teléfono y opt-in de WhatsApp desde la metadata del
--    signup. Conserva la seguridad de 017 (self-signup solo patient/professional;
--    cualquier otro rol se degrada a patient). El opt-in solo se honra si el
--    teléfono viene presente; sin teléfono queda en false.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_whatsapp_opt_in BOOLEAN;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

  -- Seguridad: el registro público NUNCA otorga roles privilegiados.
  IF v_role NOT IN ('patient', 'professional') THEN
    v_role := 'patient';
  END IF;

  -- Opt-in solo si hay teléfono; default false.
  v_whatsapp_opt_in := COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::boolean, FALSE)
    AND v_phone IS NOT NULL;

  INSERT INTO public.profiles (id, email, full_name, role, phone, whatsapp_opt_in)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, v_phone, v_whatsapp_opt_in);

  -- Crear subperfil según rol para que pacientes y profesionales puedan usar
  -- sus funcionalidades específicas desde el primer registro.
  IF v_role = 'patient' THEN
    INSERT INTO public.patient_profiles (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF v_role = 'professional' THEN
    INSERT INTO public.professional_profiles (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
