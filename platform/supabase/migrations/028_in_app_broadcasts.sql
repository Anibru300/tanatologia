-- 028_in_app_broadcasts.sql — Notificaciones in-app masivas desde el panel admin.
-- Mismo patrón que los Comunicados por correo (email_broadcasts, migración 019):
-- tabla de historial + contadores con RLS solo-admin; el envío real lo hace la
-- Edge Function `send-notification-broadcast` con service role insertando en
-- `notifications` (tabla que NO acepta inserts de cliente por RLS).
-- Las notificaciones llegan en vivo a la campana de cada usuario porque
-- `notifications` ya está en la publicación Realtime (005).
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/028_in_app_broadcasts.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audience TEXT NOT NULL CHECK (audience IN ('all', 'patients', 'professionals')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  -- Ruta interna opcional (ej. /profesional/perfil); la campana navega aquí.
  link TEXT CHECK (link IS NULL OR (char_length(link) BETWEEN 1 AND 200)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_created ON public.notification_broadcasts(created_at DESC);

ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read notification broadcasts" ON public.notification_broadcasts;
CREATE POLICY "Admin read notification broadcasts" ON public.notification_broadcasts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin insert notification broadcasts" ON public.notification_broadcasts;
CREATE POLICY "Admin insert notification broadcasts" ON public.notification_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Admin update notification broadcasts" ON public.notification_broadcasts;
CREATE POLICY "Admin update notification broadcasts" ON public.notification_broadcasts
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

COMMIT;
