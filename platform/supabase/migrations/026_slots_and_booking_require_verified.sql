-- 026: Solo profesionales verificados publican disponibilidad y reciben citas nuevas
-- Revisa/deny:
--  1) INSERT en availability_slots exigía solo ser el dueño → un profesional no verificado
--     (pending/in_review/rejected) podía publicar horarios vía API. Ahora INSERT exige
--     verification_status = 'verified'. SELECT/UPDATE/DELETE siguen siendo del dueño
--     (puede limpiar sus slots aunque aún no esté verificado).
--  2) INSERT en appointments (paciente) no exigía verificación del profesional → se agrega
--     verified + visible a la WITH CHECK.
--  3) Limpieza: slots de profesionales no verificados u ocultos (eran ilegibles para
--     pacientes por RLS, pero se purgan para consistencia con la migración 024).

BEGIN;

-- 1) Políticas granulares de availability_slots
DROP POLICY IF EXISTS "Professionals manage own availability slots" ON public.availability_slots;

CREATE POLICY "Professionals read own slots" ON public.availability_slots
  FOR SELECT USING (
    auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id)
  );

CREATE POLICY "Professionals insert own slots when verified" ON public.availability_slots
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id)
    AND (SELECT verification_status FROM public.professional_profiles WHERE id = professional_profile_id) = 'verified'
  );

CREATE POLICY "Professionals update own slots" ON public.availability_slots
  FOR UPDATE USING (
    auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id)
  );

CREATE POLICY "Professionals delete own slots" ON public.availability_slots
  FOR DELETE USING (
    auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id)
  );

-- 2) Paciente solo crea citas con profesional verificado y visible
DROP POLICY IF EXISTS "Patients create own appointments" ON public.appointments;
CREATE POLICY "Patients create own appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT profile_id FROM public.patient_profiles WHERE id = patient_profile_id)
    AND EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_profile_id
        AND pp.verification_status = 'verified'
        AND pp.is_visible = true
    )
  );

-- 3) Purgar slots de profesionales no verificados u ocultos
DELETE FROM public.availability_slots
WHERE professional_profile_id IN (
  SELECT id FROM public.professional_profiles
  WHERE verification_status <> 'verified' OR is_visible = false
);

COMMIT;
