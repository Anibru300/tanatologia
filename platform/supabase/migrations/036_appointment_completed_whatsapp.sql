-- 036_appointment_completed_whatsapp.sql — Aviso WhatsApp "sesión completada".
--
-- Cierra el circuito de avisos WhatsApp (034): al pasar una cita a 'completed'
-- (profesional marca al colgar, vía onHangup, o el cron auto-complete-past-appointments
-- de 031) el paciente recibe la plantilla sc_sesion_completada_3 con CTA a la
-- reseña. Mismo patrón que la cancelación en 034: best-effort, solo opt-in,
-- correo y notificación in-app siguen siendo los canales garantizados.
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/036_appointment_completed_whatsapp.sql
-- Requiere: Edge Function whatsapp-notify con soporte de 'appointment_completed'
-- (lee WA_TEMPLATE_COMPLETED, default sc_sesion_completada_3) y el secret
-- WA_TEMPLATE_COMPLETED configurado en Supabase.
BEGIN;

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

    -- 036: al completarse la sesión, aviso WhatsApp al paciente (CTA a reseña).
    IF NEW.status = 'completed' THEN
      PERFORM public.dispatch_whatsapp('appointment_completed', jsonb_build_object('appointment_id', NEW.id));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_appointment_events ON public.appointments;
CREATE TRIGGER notify_appointment_events
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_events();

COMMIT;
