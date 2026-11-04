-- 037: Avisos por WhatsApp activados por defecto + registro con teléfono obligatorio
-- (decisión del dueño 2026-11-03). El opt-in ya no es un checkbox: todo usuario con
-- teléfono válido registrado recibe los avisos de cita. Se conserva la columna
-- whatsapp_opt_in como fuente real (true/false) para el despacho whatsapp-notify.
--
-- 1) Default de la columna: true (los nuevos perfiles nacen con avisos activados;
--    el trigger de abajo solo lo pone en false cuando no hay teléfono).
ALTER TABLE public.profiles
  ALTER COLUMN whatsapp_opt_in SET DEFAULT TRUE;

-- 2) handle_new_user: opt-in automático cuando hay teléfono (el checkbox se eliminó
--    del registro; la metadata whatsapp_opt_in se ignora a propósito).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_timezone TEXT;
  v_whatsapp_opt_in BOOLEAN;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_timezone := NULLIF(LEFT(NEW.raw_user_meta_data->>'timezone', 64), '');

  -- Seguridad: el registro público NUNCA otorga roles privilegiados.
  IF v_role NOT IN ('patient', 'professional') THEN
    v_role := 'patient';
  END IF;

  -- Avisos por WhatsApp activados por defecto: cualquier usuario con teléfono
  -- registrado los recibe (037). Sin teléfono no hay avisos (la Edge Function
  -- normaliza a E.164 e ignora destinatarios sin teléfono válido).
  v_whatsapp_opt_in := v_phone IS NOT NULL;

  INSERT INTO public.profiles (id, email, full_name, role, phone, whatsapp_opt_in, timezone)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, v_phone, v_whatsapp_opt_in, v_timezone);

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
