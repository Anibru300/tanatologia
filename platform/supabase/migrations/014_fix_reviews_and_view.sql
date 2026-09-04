-- 014_fix_reviews_and_view.sql — Correcciones sobre 013:
-- 1. El trigger 003 (enforce_professional_profile_update_restrictions) bloqueaba el
--    rating agregado porque corre con el uid del invocador aunque el trigger agregado
--    sea SECURITY DEFINER. Se exime cuando la UPDATE proviene de otro trigger
--    (pg_trigger_depth() > 1), que es el único camino legítimo de actualización del
--    rating (triggers update_professional_rating / update_patient_rating).
-- 2. La vista professional_reviews_public quedaba legible para anon por los default
--    privileges de Supabase; se revoca y queda solo para authenticated.
BEGIN;

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

  -- El rating solo lo actualizan los triggers agregados (013) o un admin.
  IF NEW.rating IS DISTINCT FROM OLD.rating
     AND NOT public.is_admin(auth.uid())
     AND pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar la calificación';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE SELECT ON public.professional_reviews_public FROM anon;

COMMIT;
