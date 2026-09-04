-- 017_fix_signup_role_escalation.sql — CRÍTICO: el trigger handle_new_user() aceptaba
-- cualquier rol (incluido 'admin' y 'support') desde raw_user_meta_data del signup,
-- permitiendo escalación de privilegios a cualquiera que llame a la API de registro.
-- Ahora el self-signup solo permite 'patient' o 'professional'; cualquier otro valor
-- se degrada silenciosamente a 'patient'. Los roles admin/support solo los crea un
-- admin existente (Dashboard > Authentication) o SQL con service role.
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Seguridad: el registro público NUNCA otorga roles privilegiados.
  IF v_role NOT IN ('patient', 'professional') THEN
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_role);

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
