-- 029_tutorial_views_own_read.sql — Permite a cada usuario leer su propio
-- progreso de tutoriales (tutorial_views). La RLS de 022 solo dejaba SELECT
-- al admin; el listado de tutoriales necesita saber si el usuario ya terminó
-- de ver un video para quitarle la marca "Nuevo".
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/029_tutorial_views_own_read.sql
BEGIN;

DROP POLICY IF EXISTS "Users read own tutorial views" ON public.tutorial_views;
CREATE POLICY "Users read own tutorial views" ON public.tutorial_views
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

COMMIT;
