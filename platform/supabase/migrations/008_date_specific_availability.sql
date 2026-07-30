-- =============================================================================
-- Migración 008 — Disponibilidad por fecha/hora específica (slots)
-- =============================================================================
-- Reemplaza la tabla `availability` (rangos recurrentes por día de semana) por
-- `availability_slots`: cada fila es un horario agendable concreto
-- (ej. "30 de julio 2026, 20:00-20:50"). El profesional los crea desde un
-- calendario; el paciente solo puede agendar sobre slots existentes y libres.
--
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

BEGIN;

-- Requerida para la constraint EXCLUDE con igualdad sobre UUID + rango tstzrange.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT availability_slots_range CHECK (slot_start < slot_end),
  -- Consistencia ACID: un profesional no puede tener dos slots traslapados.
  CONSTRAINT availability_slots_no_overlap EXCLUDE USING gist (
    professional_profile_id WITH =,
    tstzrange(slot_start, slot_end) WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_prof_time
  ON public.availability_slots(professional_profile_id, slot_start);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- El profesional gestiona sus propios slots (mismo patrón que la tabla anterior).
CREATE POLICY "Professionals manage own availability slots" ON public.availability_slots
  FOR ALL USING (
    auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id)
  );

-- Admin total.
CREATE POLICY "Admins have full access on availability slots" ON public.availability_slots
  FOR ALL USING (public.is_admin(auth.uid()));

-- Lectura para usuarios autenticados: solo slots de profesionales verificados
-- y visibles (necesario para el booking del paciente).
CREATE POLICY "Authenticated read verified availability slots" ON public.availability_slots
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_profile_id
        AND pp.verification_status = 'verified'
        AND pp.is_visible = true
    )
  );

-- Se elimina el modelo recurrente por día de semana (los datos eran de prueba).
DROP TABLE IF EXISTS public.availability;

COMMIT;
