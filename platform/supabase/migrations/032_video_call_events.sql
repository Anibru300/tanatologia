-- 032_video_call_events.sql — Registro ground-truth de videollamadas JaaS.
--
-- La plataforma no sabe si una videollamada realmente ocurrió (incidente
-- 2026-10-16: sesión efectuada que jamás se reflejó en la cita). JaaS (8x8.vc)
-- puede avisarnos por webhook en tiempo real: quién entró/salió de la sala y
-- cuándo se creó/destruyó. La Edge Function `jaas-webhook` verifica la firma
-- HMAC-SHA256 (header X-Jaas-Signature, secreto JAAS_WEBHOOK_SECRET), resuelve
-- la sala (video_link de la cita) e inserta aquí cada evento.
--
-- De aquí se derivan los hechos que el admin ve en /admin/citas: participantes
-- reales, duración real y detección de no-show (sala destruida sin ≥2
-- participantes → la cita pendiente pasa a 'no_show' desde la función).
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/032_video_call_events.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.video_call_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  participant_jid TEXT,
  participant_name TEXT,
  is_moderator BOOLEAN,
  occurred_at TIMESTAMPTZ NOT NULL,   -- timestamp del evento (fuente de verdad de JaaS)
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key TEXT NOT NULL,
  raw JSONB NOT NULL
);

-- JaaS puede reintentar: el idempotencyKey deduplica por cita
CREATE UNIQUE INDEX IF NOT EXISTS video_call_events_appointment_idempotency
  ON public.video_call_events(appointment_id, idempotency_key);
CREATE INDEX IF NOT EXISTS video_call_events_appointment_time
  ON public.video_call_events(appointment_id, occurred_at);

ALTER TABLE public.video_call_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read video call events" ON public.video_call_events;
CREATE POLICY "Admins read video call events" ON public.video_call_events
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Escritura: únicamente service role (la Edge Function jaas-webhook).
-- Sin política INSERT para autenticados/anon.

COMMIT;
