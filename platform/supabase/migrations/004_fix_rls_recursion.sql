-- SOMOS-CALMA — Migración 004: corrige recursión infinita en RLS
--
-- La política "Professionals read assigned patients" en patient_profiles
-- consultaba la tabla appointments. A su vez, las políticas de appointments
-- para pacientes consultaban patient_profiles, generando recursión infinita
-- (error 42P17: infinite recursion detected in policy).
--
-- Como actualmente el portal de profesional no lee patient_profiles directamente
-- (usa datos de citas), eliminamos esta política. En el futuro se puede
-- reemplazar por una función SECURITY DEFINER que evite la recursión.

BEGIN;

DROP POLICY IF EXISTS "Professionals read assigned patients" ON public.patient_profiles;

COMMIT;
