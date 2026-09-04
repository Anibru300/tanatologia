-- 013_reminders_intake_reviews.sql — Recordatorios, encuesta de registro y reseñas
-- Aplicar en Supabase Cloud con: supabase db query --linked -f platform/supabase/migrations/013_reminders_intake_reviews.sql
--
-- Cambios:
-- 1. patient_profiles: intake JSONB (encuesta de registro) + rating (agregado de profesionales).
-- 2. professional_profiles: education (formación académica) + rating_count.
-- 3. Tabla professional_reviews (paciente califica al profesional; vista pública anónima).
-- 4. Tabla patient_reviews (profesional califica al paciente; privada entre profesional/admin).
-- 5. appointments: flags reminder_24h_sent / reminder_15m_sent (los marca la Edge Function).
BEGIN;

-- =============================================================================
-- 1. Columnas de intake y rating en perfiles
-- =============================================================================
ALTER TABLE public.patient_profiles
  ADD COLUMN IF NOT EXISTS intake JSONB,                 -- respuestas encuesta de registro (Bloque A y B)
  ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0);

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS education TEXT,               -- títulos, maestrías, especialidades académicas
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0);

-- =============================================================================
-- 2. Reseñas del profesional (visibles en el directorio, paciente anónimo)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.professional_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_reviews_pro ON public.professional_reviews(professional_profile_id, created_at DESC);

-- Validación: solo el paciente de la cita, con cita completada, una reseña por cita
CREATE OR REPLACE FUNCTION public.validate_professional_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
BEGIN
  IF NEW.patient_profile_id IS DISTINCT FROM (
    SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Solo el paciente de la cita puede dejar esta reseña';
  END IF;

  SELECT * INTO v_appointment FROM public.appointments WHERE id = NEW.appointment_id;

  IF NOT FOUND
     OR v_appointment.patient_profile_id IS DISTINCT FROM NEW.patient_profile_id
     OR v_appointment.professional_profile_id IS DISTINCT FROM NEW.professional_profile_id
     OR v_appointment.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'La reseña requiere una cita completada entre ese paciente y ese profesional';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_professional_review_trigger ON public.professional_reviews;
CREATE TRIGGER validate_professional_review_trigger
  BEFORE INSERT ON public.professional_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_professional_review();

-- Agregado de rating en professional_profiles
CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro UUID := COALESCE(NEW.professional_profile_id, OLD.professional_profile_id);
BEGIN
  UPDATE public.professional_profiles
  SET rating = COALESCE((
        SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM public.professional_reviews
        WHERE professional_profile_id = v_pro), 0),
      rating_count = (SELECT COUNT(*) FROM public.professional_reviews
        WHERE professional_profile_id = v_pro)
  WHERE id = v_pro;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_professional_rating_trigger ON public.professional_reviews;
CREATE TRIGGER update_professional_rating_trigger
  AFTER INSERT OR DELETE OR UPDATE OF rating ON public.professional_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_professional_rating();

-- RLS
ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients insert own professional reviews" ON public.professional_reviews;
CREATE POLICY "Patients insert own professional reviews" ON public.professional_reviews
  FOR INSERT TO authenticated
  WITH CHECK (patient_profile_id = (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own professional reviews" ON public.professional_reviews;
CREATE POLICY "Users read own professional reviews" ON public.professional_reviews
  FOR SELECT TO authenticated
  USING (
    patient_profile_id = (SELECT id FROM public.patient_profiles WHERE profile_id = auth.uid())
    OR professional_profile_id = (SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admin full access professional reviews" ON public.professional_reviews;
CREATE POLICY "Admin full access professional reviews" ON public.professional_reviews
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Vista pública anónima para el directorio (sin exponer patient_profile_id).
-- Las vistas en Postgres se ejecutan con permisos del owner (postgres) y
-- heredan la RLS de la tabla base; la RLS de la tabla no expone el paciente a
-- terceros, y la vista solo proyecta columnas no sensibles.
CREATE OR REPLACE VIEW public.professional_reviews_public AS
SELECT id, professional_profile_id, rating, comment, created_at
FROM public.professional_reviews;

GRANT SELECT ON public.professional_reviews_public TO authenticated;

-- =============================================================================
-- 3. Reseñas del paciente (privadas: profesionales con cita con ese paciente + admin)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patient_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_reviews_patient ON public.patient_reviews(patient_profile_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_patient_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
BEGIN
  IF NEW.professional_profile_id IS DISTINCT FROM (
    SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Solo el profesional de la cita puede calificar a este paciente';
  END IF;

  SELECT * INTO v_appointment FROM public.appointments WHERE id = NEW.appointment_id;

  IF NOT FOUND
     OR v_appointment.professional_profile_id IS DISTINCT FROM NEW.professional_profile_id
     OR v_appointment.patient_profile_id IS DISTINCT FROM NEW.patient_profile_id
     OR v_appointment.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'La calificación requiere una cita completada entre ese profesional y ese paciente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_patient_review_trigger ON public.patient_reviews;
CREATE TRIGGER validate_patient_review_trigger
  BEFORE INSERT ON public.patient_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_patient_review();

CREATE OR REPLACE FUNCTION public.update_patient_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pat UUID := COALESCE(NEW.patient_profile_id, OLD.patient_profile_id);
BEGIN
  UPDATE public.patient_profiles
  SET rating = COALESCE((
        SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM public.patient_reviews
        WHERE patient_profile_id = v_pat), 0),
      rating_count = (SELECT COUNT(*) FROM public.patient_reviews
        WHERE patient_profile_id = v_pat)
  WHERE id = v_pat;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_patient_rating_trigger ON public.patient_reviews;
CREATE TRIGGER update_patient_rating_trigger
  AFTER INSERT OR DELETE OR UPDATE OF rating ON public.patient_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_patient_rating();

-- RLS
ALTER TABLE public.patient_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals insert own patient reviews" ON public.patient_reviews;
CREATE POLICY "Professionals insert own patient reviews" ON public.patient_reviews
  FOR INSERT TO authenticated
  WITH CHECK (professional_profile_id = (SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "Professionals with appointment read patient reviews" ON public.patient_reviews;
CREATE POLICY "Professionals with appointment read patient reviews" ON public.patient_reviews
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.professional_profiles pp ON pp.id = a.professional_profile_id
      WHERE a.patient_profile_id = patient_reviews.patient_profile_id
        AND pp.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin full access patient reviews" ON public.patient_reviews;
CREATE POLICY "Admin full access patient reviews" ON public.patient_reviews
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =============================================================================
-- 4. Flags de recordatorio en appointments (los marca la Edge Function con service role)
-- =============================================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_15m_sent BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
