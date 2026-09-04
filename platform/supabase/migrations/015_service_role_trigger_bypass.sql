-- 015_service_role_trigger_bypass.sql — Permite que el service role (Edge Functions,
-- invocaciones con SUPABASE_SERVICE_ROLE_KEY donde auth.uid() IS NULL) actualice citas.
-- Sin esto, el trigger enforce_appointment_update_restrictions (005) rechazaba los
-- UPDATE de las banderas de recordatorio con "No tienes permiso para actualizar esta cita".
BEGIN;

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
  -- Service role (Edge Functions/cron): sin JWT, plena confianza.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

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

COMMIT;