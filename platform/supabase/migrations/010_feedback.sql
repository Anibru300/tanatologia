-- 010_feedback.sql — Sistema de feedback para la Beta
-- Tabla feedback + RLS + trigger de rol. Aplicar en Supabase (SQL Editor o
-- `supabase db query --linked -f platform/supabase/migrations/010_feedback.sql`).
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ Tabla feedback ============
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'professional')),
  type TEXT NOT NULL CHECK (type IN ('general', 'suggestion', 'issue', 'praise')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (char_length(comment) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'dismissed')),
  admin_notes TEXT CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_profile ON public.feedback(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON public.feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_role ON public.feedback(role, created_at DESC);

-- updated_at automático (reusa la función existente de 001)
DROP TRIGGER IF EXISTS update_feedback_updated_at ON public.feedback;
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- El role se copia de profiles para evitar spoofing (el usuario no elige su rol)
CREATE OR REPLACE FUNCTION public.set_feedback_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT role INTO NEW.role
  FROM public.profiles
  WHERE id = NEW.profile_id;

  IF NEW.role IS NULL THEN
    RAISE EXCEPTION 'Perfil no encontrado para feedback';
  END IF;

  IF NEW.role NOT IN ('patient', 'professional') THEN
    RAISE EXCEPTION 'Solo pacientes y profesionales pueden enviar feedback';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_feedback_role_trigger ON public.feedback;
CREATE TRIGGER set_feedback_role_trigger
  BEFORE INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_feedback_role();

-- ============ RLS ============
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado (paciente/profesional) crea feedback SOLO a su nombre.
-- El trigger set_feedback_role garantiza que role no se falsifique.
DROP POLICY IF EXISTS "Users insert own feedback" ON public.feedback;
CREATE POLICY "Users insert own feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- Cada usuario lee solo su propio feedback
DROP POLICY IF EXISTS "Users read own feedback" ON public.feedback;
CREATE POLICY "Users read own feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

-- El dueño puede eliminar su propio feedback mientras esté nuevo (corrección de errores)
DROP POLICY IF EXISTS "Users delete own new feedback" ON public.feedback;
CREATE POLICY "Users delete own new feedback" ON public.feedback
  FOR DELETE TO authenticated
  USING (auth.uid() = profile_id AND status = 'new');

-- Admin: acceso total (lectura con filtros, cambio de estado, notas, eliminación)
DROP POLICY IF EXISTS "Admin full access feedback" ON public.feedback;
CREATE POLICY "Admin full access feedback" ON public.feedback
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

COMMIT;
