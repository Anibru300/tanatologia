-- SOMOS-CALMA — Migración 006: fix de submit_for_review()
-- Ejecutar en SQL Editor de Supabase Cloud después de 005.
--
-- Problema: el trigger enforce_professional_profile_update_restrictions (migración 003)
-- bloquea cualquier cambio de verification_status que no venga de un admin,
-- incluyendo el que hace la RPC oficial submit_for_review(), porque aunque la
-- función es SECURITY DEFINER, auth.uid() sigue siendo el usuario que la llamó.
--
-- Solución: la RPC levanta una bandera de sesión (set_config con is_local=true,
-- válida solo dentro de su propia transacción) y el trigger la reconoce.

BEGIN;

-- 1. Trigger actualizado: respeta la bandera de sesión de la RPC oficial
CREATE OR REPLACE FUNCTION public.enforce_professional_profile_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cambio autorizado por la RPC oficial submit_for_review()
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

  IF NEW.rating IS DISTINCT FROM OLD.rating
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar la calificación';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. RPC actualizada: levanta la bandera solo durante su transacción
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

  SELECT COUNT(*) INTO v_doc_count
  FROM public.professional_documents
  WHERE professional_profile_id = v_pp.id
    AND document_type IN ('cedula', 'titulo', 'ine');

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
