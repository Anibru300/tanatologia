-- 039_availability_alerts.sql — "Avísame cuando abra agenda".
-- Un paciente (registrado o visitante anónimo del sitio estático) deja su
-- correo para que le avisemos cuando un profesional verificado (sin horarios
-- publicados) publique su primera disponibilidad.
--
-- Piezas:
--   1. Tabla availability_alerts (una fila = un correo esperando, one-shot:
--      al notificar se marca notified_at; no hay reenvíos ni spam).
--   2. RLS: lectura solo para el profesional dueño + admin. SIN política de
--      INSERT para anon/authenticated: los altas SOLO entran vía la Edge
--      Function `availability-alert` (service role), mismo patrón que el
--      chat (023: escritura solo por RPCs/funciones).
--   3. Trigger AFTER INSERT en availability_slots: si el profesional tiene
--      interesados pendientes, despacha (pg_net, best-effort) la Edge
--      Function interna `availability-notify`, que envía los correos y
--      marca notified_at. El despacho nunca tumba la publicación del slot.
--
-- Aplicar en Cloud:
--   supabase db query --linked -f platform/supabase/migrations/039_availability_alerts.sql

-- =============================================================================
-- 1. Tabla
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.availability_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);

-- Un correo solo puede esperar una vez por profesional (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS availability_alerts_prof_email_key
  ON public.availability_alerts (professional_profile_id, lower(email));

-- Índice parcial para el listado de pendientes del profesional y del notify.
CREATE INDEX IF NOT EXISTS availability_alerts_prof_pending_idx
  ON public.availability_alerts (professional_profile_id)
  WHERE notified_at IS NULL;

COMMENT ON TABLE public.availability_alerts IS
  'Correos de pacientes/visitantes que quieren que se les avise cuando un profesional publica disponibilidad (one-shot).';

-- =============================================================================
-- 2. RLS
-- =============================================================================
ALTER TABLE public.availability_alerts ENABLE ROW LEVEL SECURITY;

-- Lectura: el profesional dueño del subperfil (para ver cuántos lo esperan)
-- y admin (supervisión). No hay UPDATE/DELETE para usuarios: el único
-- "update" posible es notified_at, y lo hace la Edge Function con service role.
CREATE POLICY availability_alerts_select ON public.availability_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_profile_id
        AND pp.profile_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

-- =============================================================================
-- 3. Despacho + trigger (best-effort: un fallo de correo nunca tumba el INSERT
--    del availability_slot).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_availability_alerts(p_professional_profile_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM availability_alerts
    WHERE professional_profile_id = p_professional_profile_id
      AND notified_at IS NULL
  ) THEN
    RETURN;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

    IF v_secret IS NULL THEN
      RAISE WARNING 'dispatch_availability_alerts: CRON_SECRET no encontrado en vault';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/availability-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object('professional_profile_id', p_professional_profile_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_availability_alerts (%): %', p_professional_profile_id, SQLERRM;
  END;
END;
$$;

-- Seguridad (mismo endurecimiento que 035/038): Supabase otorga EXECUTE por
-- defecto a anon/authenticated; esta función solo la deben invocar triggers.
REVOKE EXECUTE ON FUNCTION public.dispatch_availability_alerts(uuid) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_availability_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.dispatch_availability_alerts(NEW.professional_profile_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS availability_slots_notify_alerts ON public.availability_slots;
CREATE TRIGGER availability_slots_notify_alerts
  AFTER INSERT ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.notify_availability_alerts();
