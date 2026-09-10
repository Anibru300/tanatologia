-- 024_purge_expired_availability_slots.sql — Purgar slots de disponibilidad vencidos.
--
-- Problema diagnosticado 2026-09-09: el listado del profesional solo muestra slots
-- futuros (slot_start >= now), pero la constraint EXCLUDE availability_slots_no_overlap
-- bloquea inserts contra TODAS las filas, incluidas las vencidas e invisibles. Resultado:
-- "no tengo horarios registrados" + "se traslapa con otro que ya tienes registrado".
--
-- Fix:
--   1. Purgar de inmediato los slots vencidos (un slot pasado no sirve para agendar;
--      las citas ya creadas viven en su propia tabla y no referencian el slot).
--   2. Programar purga horaria vía pg_cron (misma infraestructura que 013/021).

-- 1. Limpieza inmediata
DELETE FROM public.availability_slots WHERE slot_end < now();

-- 2. Purgar horariamente (minuto 23 de cada hora, hora UTC; la tabla es pequeña)
SELECT cron.unschedule(j.jobid)
FROM cron.job j
WHERE j.jobname = 'purge-expired-availability-slots';

SELECT cron.schedule(
  'purge-expired-availability-slots',
  '23 * * * *',
  'DELETE FROM public.availability_slots WHERE slot_end < now();'
);
