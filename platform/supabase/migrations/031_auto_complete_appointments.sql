-- 031_auto_complete_appointments.sql — Cierre automático de citas pasadas.
--
-- Contexto: la plataforma no detecta que una videollamada ocurrió (Jitsi/JaaS
-- no reporta a la app), así que las citas se quedaban en 'confirmed' para
-- siempre a menos que el profesional las marcara a mano. Incidente real
-- 2026-10-16: sesión efectuada que nunca se reflejó en el estado.
--
-- Cambios:
--   1. Trigger guardián: una cita solo puede pasar a 'completed' cuando su
--      hora llegó (15 min de tolerancia, igual que la ventana de acceso a la
--      sala). Aplica al botón manual y a la señal de colgar, no al cron.
--   2. pg_cron horario: marca 'completed' las citas pending/confirmadas cuya
--      hora ya pasó (inicio + duración + 15 min de tolerancia). SECURITY
--      DEFINER para no depender del rol del ejecutor del cron.
--
-- Efecto colateral bueno: notify_appointment_events (005) notifica al paciente
-- "Tu sesión fue completada", que desbloquea la reseña en PatientAppointments.
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/031_auto_complete_appointments.sql
BEGIN;

-- 1. No se puede completar una cita que aún no comienza
CREATE OR REPLACE FUNCTION public.validate_appointment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND OLD.status IN ('pending', 'confirmed')
     AND now() < OLD.scheduled_at - interval '15 minutes' THEN
    RAISE EXCEPTION 'No se puede marcar como completada una cita que aún no comienza';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_appointment_completion ON public.appointments;
CREATE TRIGGER validate_appointment_completion
  BEFORE UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_completion();

-- 2. Auto-cierre horario de citas ya terminadas (minuto 53, hora UTC)
CREATE OR REPLACE FUNCTION public.auto_complete_past_appointments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.appointments
  SET status = 'completed'
  WHERE status IN ('pending', 'confirmed')
    AND scheduled_at + make_interval(mins => duration_minutes + 15) < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT cron.unschedule(j.jobid)
FROM cron.job j
WHERE j.jobname = 'auto-complete-past-appointments';

SELECT cron.schedule(
  'auto-complete-past-appointments',
  '53 * * * *',
  $$SELECT public.auto_complete_past_appointments();$$
);

COMMIT;
