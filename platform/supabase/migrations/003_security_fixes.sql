-- SOMOS-CALMA — Migración 003: correcciones de seguridad críticas
-- Ejecutar en SQL Editor de Supabase Cloud después de 001 y 002.
--
-- Cambios principales:
-- 1. Auto-registro restringido a paciente/profesional (no admin/support).
-- 2. Nombres duplicados en subperfiles para evitar joins bloqueados por RLS.
-- 3. video_link generado automáticamente con sala Jitsi aleatoria.
-- 4. RLS endurecido en profiles, professional_profiles, appointments,
--    clinical_notes, quotes y audit_logs.
-- 5. Rate limiting básico en cotizaciones anónimas.

BEGIN;

-- =============================================================================
-- 1. Denormalizar full_name en subperfiles (evita joins contra RLS de profiles)
-- =============================================================================
ALTER TABLE public.patient_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Poblar nombres existentes
UPDATE public.patient_profiles pp
SET full_name = p.full_name
FROM public.profiles p
WHERE pp.profile_id = p.id
  AND (pp.full_name IS NULL OR pp.full_name = '');

UPDATE public.professional_profiles pp
SET full_name = p.full_name
FROM public.profiles p
WHERE pp.profile_id = p.id
  AND (pp.full_name IS NULL OR pp.full_name = '');

-- =============================================================================
-- 2. Sincronizar full_name desde profiles hacia subperfiles
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.patient_profiles
  SET full_name = NEW.full_name
  WHERE profile_id = NEW.id
    AND full_name IS DISTINCT FROM NEW.full_name;

  UPDATE public.professional_profiles
  SET full_name = NEW.full_name
  WHERE profile_id = NEW.id
    AND full_name IS DISTINCT FROM NEW.full_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_full_name ON public.profiles;
CREATE TRIGGER sync_profile_full_name
  AFTER UPDATE OF full_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_full_name();

-- =============================================================================
-- 3. Restringir auto-registro: solo paciente/profesional
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
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Registro público únicamente para pacientes o profesionales.
  -- Los roles admin/support deben crearse manualmente por un administrador.
  IF v_role NOT IN ('patient', 'professional') THEN
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  IF v_role = 'patient' THEN
    INSERT INTO public.patient_profiles (profile_id, full_name)
    VALUES (NEW.id, v_full_name)
    ON CONFLICT (profile_id) DO UPDATE SET full_name = EXCLUDED.full_name;
  ELSIF v_role = 'professional' THEN
    INSERT INTO public.professional_profiles (profile_id, full_name)
    VALUES (NEW.id, v_full_name)
    ON CONFLICT (profile_id) DO UPDATE SET full_name = EXCLUDED.full_name;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 4. Video link y sala Jitsi generados automáticamente al crear cita
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_appointment_video_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id TEXT;
BEGIN
  IF NEW.video_link IS NULL THEN
    v_room_id := replace(gen_random_uuid()::text, '-', '');
    -- Guardamos solo el nombre de sala; el iframe de Jitsi Meet lo interpreta directamente.
    NEW.video_link := 'sc-' || v_room_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_appointment_video_link ON public.appointments;
CREATE TRIGGER set_appointment_video_link
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_appointment_video_link();

-- =============================================================================
-- 5. Restricciones de integridad mediante triggers (columnas protegidas)
-- =============================================================================

-- profiles: evitar escalación de privilegios y modificación de campos sensibles
CREATE OR REPLACE FUNCTION public.enforce_profile_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No se puede modificar el identificador del perfil';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'No se puede modificar el correo electrónico desde el perfil';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar tu rol';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el estado activo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_update_restrictions ON public.profiles;
CREATE TRIGGER enforce_profile_update_restrictions
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_update_restrictions();

-- professional_profiles: profesionales no pueden auto-verificarse
CREATE OR REPLACE FUNCTION public.enforce_professional_profile_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar el estado de verificación';
  END IF;

  IF NEW.is_visible IS DISTINCT FROM OLD.is_visible
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar la visibilidad pública';
  END IF;

  IF NEW.rating IS DISTINCT FROM OLD.rating
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar la calificación';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_professional_profile_update_restrictions ON public.professional_profiles;
CREATE TRIGGER enforce_professional_profile_update_restrictions
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_professional_profile_update_restrictions();

-- appointments: pacientes solo cancelan/editan notas; nadie toca video_link
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
       OR NEW.video_link IS DISTINCT FROM OLD.video_link THEN
      RAISE EXCEPTION 'Paciente solo puede cancelar la cita o editar notas';
    END IF;

    RETURN NEW;
  END IF;

  IF v_is_professional THEN
    IF NEW.video_link IS DISTINCT FROM OLD.video_link THEN
      RAISE EXCEPTION 'No se permite modificar el enlace de videollamada';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No tienes permiso para actualizar esta cita';
END;
$$;

DROP TRIGGER IF EXISTS enforce_appointment_update_restrictions ON public.appointments;
CREATE TRIGGER enforce_appointment_update_restrictions
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_update_restrictions();

-- clinical_notes: solo para citas asignadas al profesional
CREATE OR REPLACE FUNCTION public.validate_clinical_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.professional_profiles pp ON pp.id = a.professional_profile_id
    WHERE a.id = NEW.appointment_id
      AND pp.profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'La nota clínica debe corresponder a una cita asignada al profesional';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_clinical_note ON public.clinical_notes;
CREATE TRIGGER validate_clinical_note
  BEFORE INSERT OR UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.validate_clinical_note();

-- quotes: rate limiting básico por correo (5 por hora)
CREATE OR REPLACE FUNCTION public.limit_quote_submissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.quotes
    WHERE email = NEW.email
      AND created_at > NOW() - INTERVAL '1 hour'
    GROUP BY email
    HAVING COUNT(*) >= 5
  ) THEN
    RAISE EXCEPTION 'Demasiadas cotizaciones desde este correo. Inténtalo de nuevo más tarde.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS limit_quote_submissions ON public.quotes;
CREATE TRIGGER limit_quote_submissions
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.limit_quote_submissions();

-- =============================================================================
-- 6. Políticas RLS corregidas
-- =============================================================================

-- profiles: usuarios solo se actualizan a sí mismos (triggers protegen columnas)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- professional_profiles: separar lectura/actualización y evitar auto-verificación
DROP POLICY IF EXISTS "Professionals can manage own profile" ON public.professional_profiles;

DROP POLICY IF EXISTS "Professionals can read own profile" ON public.professional_profiles;
CREATE POLICY "Professionals can read own profile" ON public.professional_profiles
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update own profile" ON public.professional_profiles;
CREATE POLICY "Professionals can update own profile" ON public.professional_profiles
  FOR UPDATE USING (profile_id = auth.uid());

-- appointments: pacientes pueden actualizar (cancelar) sus citas
DROP POLICY IF EXISTS "Patients update own appointments" ON public.appointments;
CREATE POLICY "Patients update own appointments" ON public.appointments
  FOR UPDATE USING (auth.uid() = (SELECT profile_id FROM public.patient_profiles WHERE id = patient_profile_id));

-- clinical_notes: profesional solo gestiona sus notas (validadas por trigger)
DROP POLICY IF EXISTS "Professionals read own notes" ON public.clinical_notes;
CREATE POLICY "Professionals manage own notes" ON public.clinical_notes
  FOR ALL USING (auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id));

-- audit_logs: eliminar inserción por usuarios (solo service_role/admin vía triggers)
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;

COMMIT;
