-- 018_timezone_geo.sql — Geografía aproximada (país/ciudad) para el panel
-- "Flujo de la página". NO se usa IP ni geolocalización precisa: solo la zona
-- horaria IANA del navegador (America/Mexico_City, Europe/Madrid, ...), que el
-- beacon de page_views y el registro (metadata de signup) envían voluntariamente.
-- El mapeo zona horaria → país/ciudad se hace en el frontend (src/lib/timezoneGeo.ts).
BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS timezone TEXT;

-- handle_new_user: persistir la zona horaria capturada en el registro.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_timezone TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_timezone := NULLIF(LEFT(NEW.raw_user_meta_data->>'timezone', 64), '');

  -- Seguridad: el registro público NUNCA otorga roles privilegiados.
  IF v_role NOT IN ('patient', 'professional') THEN
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, timezone)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, v_timezone);

  -- Crear subperfil según rol para que pacientes y profesionales puedan usar
  -- sus funcionalidades específicas desde el primer registro.
  IF v_role = 'patient' THEN
    INSERT INTO public.patient_profiles (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF v_role = 'professional' THEN
    INSERT INTO public.professional_profiles (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
