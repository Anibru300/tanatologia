-- 035_security_hardening.sql — Hardening post-auditoría 2026-10-20
-- (docs/auditoria-seguridad-2026-10-20.md)
--
-- 1. A3: restaurar la bandera de sesión app.verification_change_allowed en
--    enforce_professional_profile_update_restrictions. La 014 hizo CREATE OR
--    REPLACE del trigger y la perdió, rompiendo submit_for_review() (la RPC
--    levanta la bandera pero el trigger ya no la reconocía → ningún profesional
--    podía enviar su expediente a revisión).
-- 2. A4/M1: is_assigned_patient y la policy de lectura de patient_reviews
--    aceptaban citas CANCELADAS: un profesional con una cita cancelada leía
--    el expediente completo del paciente y las reseñas privadas. Se exige
--    cita con status <> 'cancelled'.
-- 3. M5: handle_new_user (034) perdió la persistencia de timezone (018) y el
--    cast (metadata->>'whatsapp_opt_in')::boolean lanzaba excepción con
--    metadata manipulada (registro fallaba por un campo del cliente). Cast
--    defensivo + timezone restaurado.
-- 4. A1: REVOKE de EXECUTE a funciones SECURITY DEFINER que ningún cliente
--    debe invocar directamente. Solo se llaman desde triggers o desde otras
--    funciones SECURITY DEFINER (el owner conserva EXECUTE; las policies que
--    usan is_conversation_participant / is_assigned_patient / is_admin NO se
--    tocan). get_booked_slots se conserva para authenticated: el booking
--    público necesita saber qué slots están ocupados (solo expone horarios,
--    nunca datos de pacientes).
BEGIN;

-- =============================================================================
-- 1. Trigger de professional_profiles: restaurar bandera de sesión (A3)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_professional_profile_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cambio autorizado por la RPC oficial submit_for_review() (006/007): la RPC
  -- levanta esta bandera con set_config(is_local=true) dentro de su transacción.
  IF current_setting('app.verification_change_allowed', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar el estado de verificación';
  END IF;

  IF NEW.is_visible IS DISTINCT FROM OLD.is_visible
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar la visibilidad pública';
  END IF;

  -- El rating solo lo actualizan los triggers agregados (013/014) o un admin.
  IF NEW.rating IS DISTINCT FROM OLD.rating
     AND NOT public.is_admin(auth.uid())
     AND pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar la calificación';
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2a. is_assigned_patient: exigir cita NO cancelada (A4)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_assigned_patient(p_patient_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.professional_profiles pp ON pp.id = a.professional_profile_id
    WHERE a.patient_profile_id = p_patient_profile_id
      AND pp.profile_id = auth.uid()
      AND a.status <> 'cancelled'
  );
$$;

-- 2b. patient_reviews: misma corrección en la policy de lectura (M1)
DROP POLICY IF EXISTS "Professionals with appointment read patient reviews" ON public.patient_reviews;
CREATE POLICY "Professionals with appointment read patient reviews" ON public.patient_reviews
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.professional_profiles pp ON pp.id = a.professional_profile_id
      WHERE a.patient_profile_id = patient_reviews.patient_profile_id
        AND pp.profile_id = auth.uid()
        AND a.status <> 'cancelled'
    )
  );

-- =============================================================================
-- 3. handle_new_user: cast defensivo + timezone restaurado (M5)
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
  v_timezone TEXT;
  v_whatsapp_opt_in BOOLEAN;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_timezone := NULLIF(LEFT(NEW.raw_user_meta_data->>'timezone', 64), '');

  -- Seguridad: el registro público NUNCA otorga roles privilegiados.
  IF v_role NOT IN ('patient', 'professional') THEN
    v_role := 'patient';
  END IF;

  -- Opt-in solo si hay teléfono; cast defensivo (metadata manipulada no debe
  -- tumbar el registro: solo se aceptan los strings 'true'/'false').
  v_whatsapp_opt_in := lower(trim(COALESCE(NEW.raw_user_meta_data->>'whatsapp_opt_in', ''))) = 'true'
    AND v_phone IS NOT NULL;

  INSERT INTO public.profiles (id, email, full_name, role, phone, whatsapp_opt_in, timezone)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, v_phone, v_whatsapp_opt_in, v_timezone);

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

-- =============================================================================
-- 4. REVOKE de EXECUTE en funciones SECURITY DEFINER internas (A1)
--    Solo las invocan triggers (owner) u otras funciones SECURITY DEFINER
--    (corren como owner, no necesitan el grant). El cliente jamás debe llamarlas.
-- =============================================================================
REVOKE ALL ON FUNCTION public.dispatch_user_email(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_reminders_cron() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_whatsapp(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_complete_past_appointments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.conversation_participants(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_chat(UUID, UUID) FROM PUBLIC, anon, authenticated;

COMMIT;
