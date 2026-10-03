-- 027_professional_avatar_public_rpc.sql — Expone el avatar de perfil de los
-- profesionales (verificados y visibles) a cualquier usuario autenticado,
-- sin relajar la RLS de `profiles` (que sigue siendo "solo mi propia fila").
--
-- Problema: el directorio del paciente no mostraba la foto del profesional.
-- La RLS de `profiles` solo permite leer la propia fila, así que ni por join
-- ni por query directa el paciente podía obtener `avatar_url` del profesional.
-- El bucket `avatars` ya es público (005), no hace falta signed URL.
--
-- Solución: RPC STABLE SECURITY DEFINER que devuelve SOLO (profile_id, avatar_url)
-- y únicamente para profesionales verificados + visibles (misma regla que el
-- directorio). No expone email, teléfono ni ningún otro dato de `profiles`.
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/027_professional_avatar_public_rpc.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.get_professional_avatars(p_profile_ids uuid[])
RETURNS TABLE(profile_id uuid, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.avatar_url
  FROM public.profiles p
  INNER JOIN public.professional_profiles pp ON pp.profile_id = p.id
  WHERE p.id = ANY(p_profile_ids)
    AND p.avatar_url IS NOT NULL
    AND pp.verification_status = 'verified'
    AND pp.is_visible = TRUE;
$$;

-- Cualquier usuario autenticado puede ejecutarlo; la función misma filtra
-- (solo avatares de profesionales verificados y visibles). Anónimo: no.
REVOKE ALL ON FUNCTION public.get_professional_avatars(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_professional_avatars(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_professional_avatars(uuid[]) TO authenticated;

COMMIT;
