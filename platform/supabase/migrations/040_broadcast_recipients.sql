-- 040: Destinatarios exactos en comunicados (only_emails)
-- Permite dejar un comunicado "pending" con su lista de destinatarios ya
-- resuelta (p. ej. preparado desde soporte) para que al presionar "Enviar"
-- en /admin/comunicados se envíe EXACTAMENTE a esa lista.
-- NULL = comportamiento anterior (toda la audiencia del campo audience).

BEGIN;

ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS only_emails JSONB;

COMMIT;
