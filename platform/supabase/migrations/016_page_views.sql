-- 016_page_views.sql — Analítica de primera parte (first-party) para el panel Admin.
-- Registra vistas de página del sitio estático y de la app React vía la Edge Function
-- `track-view` (único escritor, con service role; la tabla no acepta inserts directos).
-- El admin lee vía RLS (is_admin) para el panel "Analíticas".
BEGIN;

CREATE TABLE IF NOT EXISTS public.page_views (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path TEXT NOT NULL CHECK (char_length(path) BETWEEN 1 AND 300),
  referrer TEXT CHECK (referrer IS NULL OR char_length(referrer) <= 500),
  session_key TEXT NOT NULL CHECK (char_length(session_key) BETWEEN 8 AND 64),
  source TEXT NOT NULL DEFAULT 'site' CHECK (source IN ('site', 'app')),
  device TEXT CHECK (device IS NULL OR char_length(device) <= 20),
  browser TEXT CHECK (browser IS NULL OR char_length(browser) <= 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.page_views(session_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views(path, created_at DESC);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Solo admin lee/borra. La inserción la hace la Edge Function con service role
-- (sin JWT → bypass RLS), jamás desde el cliente directo.
DROP POLICY IF EXISTS "Admin read page views" ON public.page_views;
CREATE POLICY "Admin read page views" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin delete page views" ON public.page_views;
CREATE POLICY "Admin delete page views" ON public.page_views
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Rate limit por sesión: máx. 60 vistas/minuto por session_key (anti-spam básico
-- a nivel BD; la Edge Function además limita por IP).
CREATE OR REPLACE FUNCTION public.rate_limit_page_views()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_recent
  FROM public.page_views
  WHERE session_key = NEW.session_key
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_recent >= 60 THEN
    RAISE EXCEPTION 'Rate limit excedido para esta sesión';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_page_views_trigger ON public.page_views;
CREATE TRIGGER rate_limit_page_views_trigger
  BEFORE INSERT ON public.page_views
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_page_views();

COMMIT;
