-- SOMOS-CALMA — Migración 007: correcciones de auditoría E2E (2026-07-28)
--
-- 1. El paciente no podía guardar su perfil: no existía política UPDATE en
--    patient_profiles (PostgREST afecta 0 filas y devuelve 200 → fallo silencioso).
-- 2. El profesional veía "Paciente" genérico: la migración 004 eliminó la
--    política de lectura por recursión. Se restaura con función SECURITY DEFINER.
-- 3. submit_for_review() aceptaba 3 documentos del mismo tipo y contaba
--    documentos rechazados; ahora exige un documento vigente por cada tipo.

BEGIN;

-- 1. Paciente actualiza su propio subperfil --------------------------------
DROP POLICY IF EXISTS "Patients update own profile" ON public.patient_profiles;
CREATE POLICY "Patients update own profile" ON public.patient_profiles
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 2. Profesional lee el nombre de sus pacientes asignados -------------------
-- SECURITY DEFINER: la consulta interna se ejecuta como el owner de la
-- función y no pasa por RLS, por lo que no hay recursión con appointments.
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
  );
$$;

DROP POLICY IF EXISTS "Professionals read assigned patients" ON public.patient_profiles;
CREATE POLICY "Professionals read assigned patients" ON public.patient_profiles
  FOR SELECT
  USING (public.is_assigned_patient(id));

-- 3. submit_for_review() exige un documento vigente por tipo ----------------
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

  -- Un documento vigente (no rechazado) por cada tipo obligatorio
  SELECT COUNT(DISTINCT document_type) INTO v_doc_count
  FROM public.professional_documents
  WHERE professional_profile_id = v_pp.id
    AND document_type IN ('cedula', 'titulo', 'ine')
    AND status <> 'rejected';

  IF v_doc_count < 3 THEN
    RAISE EXCEPTION 'Sube cédula, título e identificación oficial antes de enviar a revisión';
  END IF;

  -- Bandera válida únicamente dentro de esta transacción
  PERFORM set_config('app.verification_change_allowed', '1', true);

  UPDATE public.professional_profiles
  SET verification_status = 'in_review', rejection_reason = NULL
  WHERE id = v_pp.id;

  RETURN 'in_review';
END;
$$;

COMMIT;
