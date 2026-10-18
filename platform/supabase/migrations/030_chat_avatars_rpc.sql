-- 030_chat_avatars_rpc.sql — Expone el avatar de perfil de los contrapartes del
-- chat (paciente↔profesional) sin relajar la RLS de `profiles`.
--
-- Problema: la lista de conversaciones del chat consultaba profiles.avatar_url
-- del otro participante, pero la RLS de `profiles` solo permite leer la propia
-- fila → el avatar ajeno siempre daba null y se veían iniciales (mismo bug que
-- el directorio, que se resolvió con la RPC 027 para profesionales verificados).
--
-- Diferencia con 027: aquí el otro participante puede ser paciente O profesional,
-- y no se exige verified+visible (el chat ya exige cita previa; un profesional
-- verificado pero temporalmente invisible sigue pudiendo chatear y mostrar foto).
--
-- Seguridad: la función solo devuelve (profile_id, avatar_url) de perfiles que
-- COMPARTEN una conversación con quien la ejecuta. No expone email, teléfono
-- ni ningún otro dato de `profiles`. Anónimo: no puede ejecutarla.
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/030_chat_avatars_rpc.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.get_chat_avatars(p_profile_ids uuid[])
RETURNS TABLE(profile_id uuid, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(p_profile_ids)
    AND p.avatar_url IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE (
        -- Yo soy el paciente y el otro es el profesional de una conversación nuestra
        c.patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid())
        AND c.professional_profile_id IN (SELECT id FROM public.professional_profiles WHERE profile_id = p.id)
      ) OR (
        -- Yo soy el profesional y el otro es el paciente de una conversación nuestra
        c.professional_profile_id IN (SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid())
        AND c.patient_profile_id IN (SELECT id FROM public.patient_profiles WHERE profile_id = p.id)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_chat_avatars(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_chat_avatars(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_chat_avatars(uuid[]) TO authenticated;

COMMIT;
