-- 025: Precio por consulta del profesional (pago directo, rango 150–350 MXN)
-- El campo session_price (centavos) ya existía desde 001 con default 40000 ($400, fuera de rango)
-- y CHECK (> 0). Se ajusta: default NULL (el profesional elige), rango 15000–35000.

-- 1. Normalizar valores existentes (el default viejo no fue elegido por nadie)
UPDATE public.professional_profiles SET session_price = NULL;

-- 2. Reemplazar constraint de rango
ALTER TABLE public.professional_profiles DROP CONSTRAINT IF EXISTS professional_profiles_session_price_check;
ALTER TABLE public.professional_profiles
  ALTER COLUMN session_price DROP DEFAULT,
  ALTER COLUMN session_price SET DEFAULT NULL,
  ADD CONSTRAINT professional_profiles_session_price_check
    CHECK (session_price IS NULL OR (session_price >= 15000 AND session_price <= 35000));

-- 3. Comentario documentando el modelo de pago
COMMENT ON COLUMN public.professional_profiles.session_price IS
  'Precio por consulta (50 min) en centavos MXN. Rango 15000–35000 ($150–$350). NULL = no definido. El pago es directo profesional→paciente; la plataforma no procesa cobros en la Beta.';
