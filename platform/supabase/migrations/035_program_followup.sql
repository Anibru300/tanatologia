-- =============================================================================
-- 035: Seguimiento de programas de 4/6 sesiones
--
-- Problema: al elegir 'program_4' o 'program_6' el wizard solo agendaba la
-- primera sesión y las siguientes quedaban sin seguimiento (varios casos reales).
--
-- Solución ligera (sin tabla nueva): cuando una sesión de un plan pasa a
-- 'completed', si aún faltan sesiones por agendar se notifica in-app a PACIENTE
-- y PROFESIONAL para que coordinen la siguiente. El progreso se calcula
-- contando las citas no-canceladas del mismo tipo entre el par (mismo criterio
-- que usa PatientPrograms en el frontend).
--
-- Anti-ruido:
--   - No notifica si ya existe una cita futura del mismo plan (pending/confirmed).
--   - Solo dispara en la transición a 'completed' (el cron 031 completa la cita
--     una sola vez; marcar completada de nuevo no re-notifica).
--   - No notifica cuando el plan ya se completó (used >= total).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_program_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_used INT;
  v_patient_user UUID;
  v_professional_user UUID;
  v_patient_name TEXT;
  v_professional_name TEXT;
BEGIN
  IF NEW.session_type NOT IN ('program_4', 'program_6') THEN
    RETURN NEW;
  END IF;

  v_total := CASE NEW.session_type WHEN 'program_4' THEN 4 ELSE 6 END;

  -- Sesiones del plan ya consumidas/agendadas (no canceladas) entre el par.
  SELECT count(*) INTO v_used
  FROM public.appointments
  WHERE patient_profile_id = NEW.patient_profile_id
    AND professional_profile_id = NEW.professional_profile_id
    AND session_type = NEW.session_type
    AND status <> 'cancelled';

  -- Plan terminado: nada que seguir.
  IF v_used >= v_total THEN
    RETURN NEW;
  END IF;

  -- Ya hay una siguiente sesión agendada a futuro: la videollamada/notificación
  -- de cita cubre ese caso; no molestar con doble aviso.
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE patient_profile_id = NEW.patient_profile_id
      AND professional_profile_id = NEW.professional_profile_id
      AND session_type = NEW.session_type
      AND status IN ('pending', 'confirmed')
      AND scheduled_at > now()
  ) THEN
    RETURN NEW;
  END IF;

  SELECT pp.profile_id INTO v_patient_user
  FROM public.patient_profiles pp WHERE pp.id = NEW.patient_profile_id;

  SELECT pp.profile_id INTO v_professional_user
  FROM public.professional_profiles pp WHERE pp.id = NEW.professional_profile_id;

  SELECT full_name INTO v_patient_name
  FROM public.profiles WHERE id = v_patient_user;

  SELECT full_name INTO v_professional_name
  FROM public.profiles WHERE id = v_professional_user;

  -- Al paciente: elegir el siguiente horario.
  INSERT INTO public.notifications (profile_id, type, title, body, link)
  VALUES (
    v_patient_user,
    'program_followup',
    'Tu plan de ' || v_total || ' sesiones sigue en curso',
    'Llevas ' || v_used || ' de ' || v_total || ' sesiones con ' ||
      COALESCE(v_professional_name, 'tu profesional') ||
      '. Selecciona tu siguiente horario disponible.',
    '/paciente/agendar'
  );

  -- Al profesional: publicar disponibilidad para la siguiente sesión.
  INSERT INTO public.notifications (profile_id, type, title, body, link)
  VALUES (
    v_professional_user,
    'program_followup',
    'Plan de ' || v_total || ' sesiones en curso',
    COALESCE(v_patient_name, 'Tu paciente') || ' lleva ' || v_used || ' de ' || v_total ||
      ' sesiones. Publica tu disponibilidad para que agende la siguiente.',
    '/profesional/disponibilidad'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_program_followup ON public.appointments;
CREATE TRIGGER notify_program_followup
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.notify_program_followup();
