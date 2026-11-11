-- 038_video_rejoin_grace.sql — Diagnósticos de videollamada (rastreo de audio).
--
-- Contexto: incidente 2026-11-10 — una profesional colgó para intentar arreglar
-- que "la paciente no escuchaba"; al reingresar la cita ya estaba 'completed' y
-- ambos quedaron fuera (la sesión terminó en WhatsApp personal). Se agregó una
-- prórroga de reingreso (REJOIN_GRACE_MINUTES, código) y este RPC para poder
-- rastrear DESPUÉS qué pasó con el audio: cada cliente reporta sus propios
-- eventos (joined/left, audio_muted/audio_unmuted, video_muted/video_unmuted)
-- y quedan en video_call_events junto al ground-truth del webhook de JaaS.
-- Con esto se puede responder, p. ej., "¿el profesional tenía el micrófono
-- silenciado a esa hora?".
--
-- Seguridad: SECURITY DEFINER pero solo inserta si auth.uid() ES participante
-- de la cita (paciente o profesional); EXECUTE solo para authenticated
-- (mismo patrón de endurecimiento que la migración 035). Los eventos se
-- guardan con prefijo 'DIAG_' para distinguirlos de los del webhook: el
-- admin los lee igual por RLS y getCallFacts los ignora para duración.
--
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/038_video_rejoin_grace.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.log_video_diagnostic(p_appointment_id UUID, p_event_type TEXT, p_detail JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_name TEXT;
  v_is_moderator BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_event_type IS NULL OR p_event_type !~ '^[a-z][a-z0-9_]{2,39}$' THEN
    RAISE EXCEPTION 'event_type inválido';
  END IF;

  -- Solo participantes de la cita (paciente o profesional).
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id
      AND (
        EXISTS (SELECT 1 FROM public.patient_profiles pp
                WHERE pp.id = a.patient_profile_id AND pp.profile_id = v_user)
        OR EXISTS (SELECT 1 FROM public.professional_profiles pr
                   WHERE pr.id = a.professional_profile_id AND pr.profile_id = v_user)
      )
  ) THEN
    RAISE EXCEPTION 'No participas en esta cita';
  END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_user;
  SELECT pr.profile_id = v_user INTO v_is_moderator
    FROM public.appointments a
    JOIN public.professional_profiles pr ON pr.id = a.professional_profile_id
    WHERE a.id = p_appointment_id;

  INSERT INTO public.video_call_events
    (appointment_id, event_type, participant_name, is_moderator, occurred_at, idempotency_key, raw)
  VALUES
    (p_appointment_id, 'DIAG_' || upper(p_event_type), v_name, COALESCE(v_is_moderator, false),
     now(), 'diag-' || gen_random_uuid(),
     jsonb_build_object('source', 'client', 'detail', COALESCE(p_detail, '{}'::jsonb)));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_video_diagnostic(UUID, TEXT, JSONB) FROM PUBLIC;
-- Supabase concede EXECUTE por default a anon/authenticated/service_role:
-- quitarlo a anon (la función exige auth.uid() participante, pero se endurece
-- igual que en la migración 035).
REVOKE EXECUTE ON FUNCTION public.log_video_diagnostic(UUID, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_video_diagnostic(UUID, TEXT, JSONB) TO authenticated;

COMMIT;
