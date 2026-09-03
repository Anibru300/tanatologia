-- =============================================================================
-- Migración 012 — Eliminación de cuenta propia (Beta 1.0)
-- =============================================================================
-- Permite que un usuario autenticado elimine SU PROPIA cuenta (auth.users).
-- Las eliminaciones en cascada borran perfil, subperfil, citas, slots,
-- notificaciones, feedback, notas clínicas y documentos (FKs ON DELETE CASCADE).
-- Los archivos de Storage deben borrarse desde el cliente (Storage API) antes
-- de invocar esta función; los huérfanos pueden limpiarse desde el dashboard.
--
-- Ejecutar con: supabase db query --linked -f migrations/012_delete_own_account.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para eliminar tu cuenta.';
  END IF;
  -- Solo puede borrarse a sí mismo; el cascade hace el resto.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Solo usuarios autenticados pueden ejecutarla; nunca anónimos.
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMIT;
