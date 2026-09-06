-- 022_tutorials.sql — Sistema de Tutoriales (pipeline: subir → revisar →
-- clasificar → validar → aprobar → publicar).
--
-- - tutorials: catálogo con audiencia (patient/professional/both), categoría,
--   estado de publicación y rutas de media en Storage.
-- - tutorial_views: analítica de reproducción (quién vio qué y % completado).
-- - Bucket PRIVADO `tutorials`: los objetos SOLO son legibles si el tutorial
--   asociado está PUBLICADO y la audiencia corresponde al rol del usuario.
--   Nada de borradores/desactivados queda expuesto por URL firmada.
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/022_tutorials.sql
BEGIN;

-- =============================================================================
-- 1. Tabla de tutoriales
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tutorials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  audience TEXT NOT NULL CHECK (audience IN ('patient', 'professional', 'both')),
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 1 AND 60),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'unpublished', 'rejected')),
  video_path TEXT CHECK (video_path IS NULL OR video_path ~ '^tutorials/'),
  thumbnail_path TEXT CHECK (thumbnail_path IS NULL OR thumbnail_path ~ '^tutorials/'),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Solo se puede publicar con video cargado
  CONSTRAINT published_requires_video CHECK (status <> 'published' OR video_path IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_tutorials_status_audience ON public.tutorials(status, audience, sort_order);
CREATE INDEX IF NOT EXISTS idx_tutorials_category ON public.tutorials(category);

ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;

-- SELECT: publicados y con audiencia permitida para el rol; admin ve todo
DROP POLICY IF EXISTS "Read tutorials" ON public.tutorials;
CREATE POLICY "Read tutorials" ON public.tutorials
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (status = 'published' AND (
      audience = 'both'
      OR (audience = 'patient' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'patient'))
      OR (audience = 'professional' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'professional'))
    ))
  );

-- Escritura: solo admin
DROP POLICY IF EXISTS "Admin manage tutorials" ON public.tutorials;
CREATE POLICY "Admin manage tutorials" ON public.tutorials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_tutorials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tutorials_updated_at ON public.tutorials;
CREATE TRIGGER tutorials_updated_at
  BEFORE UPDATE ON public.tutorials
  FOR EACH ROW EXECUTE FUNCTION public.set_tutorials_updated_at();

-- published_at al publicar
CREATE OR REPLACE FUNCTION public.set_tutorials_published_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status <> 'published') THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tutorials_published_at ON public.tutorials;
CREATE TRIGGER tutorials_published_at
  BEFORE INSERT OR UPDATE OF status ON public.tutorials
  FOR EACH ROW EXECUTE FUNCTION public.set_tutorials_published_at();

-- =============================================================================
-- 2. Analítica de reproducción
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tutorial_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutorial_id UUID NOT NULL REFERENCES public.tutorials(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT CHECK (role IS NULL OR role IN ('patient', 'professional', 'admin', 'support')),
  percent_watched INTEGER NOT NULL DEFAULT 0 CHECK (percent_watched BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Una fila de progreso por usuario por tutorial (el frontend hace upsert)
  CONSTRAINT tutorial_views_unique UNIQUE (tutorial_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_tutorial_views_tutorial ON public.tutorial_views(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_views_profile ON public.tutorial_views(profile_id);

ALTER TABLE public.tutorial_views ENABLE ROW LEVEL SECURITY;

-- INSERT: usuario autenticado sobre tutoriales que puede ver; su propio profile_id
DROP POLICY IF EXISTS "Track own tutorial views" ON public.tutorial_views;
CREATE POLICY "Track own tutorial views" ON public.tutorial_views
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tutorials t WHERE t.id = tutorial_id)
  );

-- UPDATE: solo su propia fila y solo puede subir el porcentaje
DROP POLICY IF EXISTS "Update own tutorial progress" ON public.tutorial_views;
CREATE POLICY "Update own tutorial progress" ON public.tutorial_views
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid() AND percent_watched >= (SELECT percent_watched FROM public.tutorial_views v WHERE v.id = id));

-- SELECT: admin
DROP POLICY IF EXISTS "Admin read tutorial views" ON public.tutorial_views;
CREATE POLICY "Admin read tutorial views" ON public.tutorial_views
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- =============================================================================
-- 3. Bucket privado de media (videos + miniaturas)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tutorials',
  'tutorials',
  false,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura: SOLO media de tutoriales PUBLICADOS con audiencia permitida.
-- Los objetos sin tutorial publicado asociado NO son legibles (ni firmados).
DROP POLICY IF EXISTS "Read published tutorial media" ON storage.objects;
CREATE POLICY "Read published tutorial media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tutorials'
    AND EXISTS (
      SELECT 1 FROM public.tutorials t
      WHERE t.status = 'published'
        AND (t.video_path = name OR t.thumbnail_path = name)
        AND (
          t.audience = 'both'
          OR (t.audience = 'patient' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'patient'))
          OR (t.audience = 'professional' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'professional'))
        )
    )
  );

-- Admin: control total del bucket
DROP POLICY IF EXISTS "Admin manage tutorial media" ON storage.objects;
CREATE POLICY "Admin manage tutorial media" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'tutorials' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'tutorials' AND public.is_admin(auth.uid()));

COMMIT;
