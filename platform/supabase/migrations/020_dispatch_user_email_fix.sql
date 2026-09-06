-- 020_dispatch_user_email_fix.sql — dispatch_user_email no encontraba CRON_SECRET
-- porque NUNCA estuvo en vault (sigue siendo Edge Function secret + hardcodeado en
-- el cron de appointment-reminders, cf. cron.job). El SELECT a vault.decrypted_secrets
-- devolvía NULL y la función salía en silencio: ningún correo transaccional llegaba.
-- Fix: incrustar el secreto en la función (mismo patrón y mismo nivel de exposición
-- que cron.job). Best-effort se mantiene (EXCEPTION WHEN OTHERS).
-- Aplicar en Supabase Cloud con:
--   supabase db query --linked -f platform/supabase/migrations/020_dispatch_user_email_fix.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.dispatch_user_email(p_type TEXT, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/user-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '5f953eaa924ad85370669042722680ce8220cb5254f7a05e'
      ),
      body := jsonb_build_object('type', p_type) || COALESCE(p_payload, '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_user_email (%): %', p_type, SQLERRM;
  END;
END;
$$;

COMMIT;
