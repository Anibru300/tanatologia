-- =============================================================================
-- Migración 009 — Integridad del booking: anti doble-reserva y validación de slot
-- =============================================================================
-- Auditoría 2026-08-02 (hallazgo crítico #6): `createAppointment` insertaba sin
-- validación en BD. Era posible (a) que dos pacientes reservaran el mismo
-- horario (race condition) y (b) agendar horarios nunca publicados por el
-- profesional vía API directa.
--
-- 1) Constraint EXCLUDE: un profesional no puede tener dos citas ACTIVAS
--    (pending/confirmed) traslapadas. Mismo patrón que availability_slots (008).
-- 2) Trigger: toda cita activa debe caber dentro de un availability_slot
--    publicado por ese profesional.
--
-- NOTA: si existen citas activas traslapadas o fuera de slot (datos de prueba),
-- la migración fallará; cancela/elimina esas filas antes de reintentar:
--   UPDATE public.appointments SET status = 'cancelled'
--   WHERE status IN ('pending','confirmed') AND <condición de prueba>;
--
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1) Anti doble-reserva (consistencia ACID a nivel BD, inmune a race conditions).
-- `timestamptz + interval` es STABLE (no IMMUTABLE) para Postgres, así que se
-- envuelve en una función IMMUTABLE; es segura porque solo suma MINUTOS
-- (sin ambigüedad de calendario/zonas horarias).
CREATE OR REPLACE FUNCTION public.appointment_range(p_start timestamptz, p_duration_minutes integer)
RETURNS tstzrange
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT tstzrange(p_start, p_start + (p_duration_minutes * interval '1 minute'), '[)')
$$;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
    professional_profile_id WITH =,
    public.appointment_range(scheduled_at, duration_minutes) WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

-- 2) La cita debe caber dentro de un slot publicado por el profesional.
CREATE OR REPLACE FUNCTION public.validate_appointment_within_slot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.availability_slots s
    WHERE s.professional_profile_id = NEW.professional_profile_id
      AND s.slot_start <= NEW.scheduled_at
      AND s.slot_end >= NEW.scheduled_at + (NEW.duration_minutes * interval '1 minute')
  ) THEN
    RAISE EXCEPTION 'El horario seleccionado no está publicado como disponible por el profesional.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_within_slot ON public.appointments;
CREATE TRIGGER trg_appointment_within_slot
  BEFORE INSERT OR UPDATE OF professional_profile_id, scheduled_at, duration_minutes, status
  ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION public.validate_appointment_within_slot();

COMMIT;
