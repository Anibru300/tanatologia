-- 021_rotate_cron_secret_vault.sql — Rotación de CRON_SECRET y migración a vault.
--
-- Motivo: el valor anterior quedó expuesto en el repositorio (migración 020,
-- hardcodeado igual que cron.job). Este archivo NO contiene secretos: el nuevo
-- valor se inserta en vault y se referencia por nombre.
--
-- Cambios:
--   1. Nuevo CRON_SECRET en vault (vault.create_secret; si ya existe, se reemplaza).
--   2. dispatch_user_email vuelve a leer de vault.decrypted_secrets (diseño 019).
--   3. dispatch_reminders_cron(): SECURITY DEFINER que lee el secreto del vault y
--      llama a appointment-reminders. El cron deja de llevar el secreto en texto
--      plano dentro de cron.job.
--   4. Reprograma el cron para usar la función (cada 10 min, como antes).
--
-- NOTA: el secret CRON_SECRET de las Edge Functions (Dashboard/CLI) debe
-- actualizarse al mismo valor con:
--   supabase secrets set CRON_SECRET=<nuevo_valor>   (se aplica aparte, no aquí)
BEGIN;

-- 1. Nuevo secreto en vault (idempotente: borra el anterior si existiera)
-- ⚠️ VALOR NO VERSIONADO: la instrucción original insertaba el secreto en texto
-- plano y fue REMOVIDA tras detectar la exposición. El valor vigente solo vive en
-- el vault de Supabase y en el Edge Function secret CRON_SECRET (rotado de nuevo
-- el 2026-09-06 en esta misma sesión; los valores históricos del repo quedaron
-- invalidados). Para reproducir: INSERT manual con vault.create_secret('<valor>', ...)
-- ejecutado localmente, nunca commiteado.
-- (El DELETE anterior se conserva por idempotencia.)
DELETE FROM vault.secrets WHERE name = 'CRON_SECRET';

-- 2. dispatch_user_email lee del vault (best-effort, sin secretos en el código)
CREATE OR REPLACE FUNCTION public.dispatch_user_email(p_type TEXT, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

    IF v_secret IS NULL THEN
      RAISE WARNING 'dispatch_user_email: CRON_SECRET no encontrado en vault';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/user-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := jsonb_build_object('type', p_type) || COALESCE(p_payload, '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_user_email (%): %', p_type, SQLERRM;
  END;
END;
$$;

-- 3. Despachador del cron de recordatorios (secreto fuera de cron.job)
CREATE OR REPLACE FUNCTION public.dispatch_reminders_cron()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

    IF v_secret IS NULL THEN
      RAISE WARNING 'dispatch_reminders_cron: CRON_SECRET no encontrado en vault';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/appointment-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_reminders_cron: %', SQLERRM;
  END;
END;
$$;

-- 4. Reprogramar cron (sin secreto en texto plano)
SELECT cron.unschedule(1);
SELECT cron.schedule('appointment-reminders', '*/10 * * * *', 'SELECT public.dispatch_reminders_cron();');

COMMIT;
