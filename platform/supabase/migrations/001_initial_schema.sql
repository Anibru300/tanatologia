-- SOMOS-CALMA — Esquema inicial ACID
-- Ejecutar en SQL Editor de Supabase Cloud (o como migración local).
-- PostgreSQL garantiza Atomicidad, Consistencia, Aislamiento y Durabilidad
-- en cada transacción. Este script envuelve todo en BEGIN/COMMIT para que,
-- si falla alguna sentencia, la base de datos vuelva exactamente a su estado anterior.

BEGIN;

-- =============================================================================
-- 1. Extensiones
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. Tablas principales
-- =============================================================================

-- Perfiles (se vincula 1:1 con auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'professional', 'admin', 'support')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfil de paciente
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  birth_date DATE,
  gender TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  reason_for_visit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfil de profesional
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_number TEXT,
  university TEXT,
  specialties TEXT[] DEFAULT '{}',
  approach TEXT,
  bio TEXT,
  session_price INTEGER DEFAULT 40000 CHECK (session_price > 0),      -- centavos
  program_4_price INTEGER DEFAULT 160000 CHECK (program_4_price > 0), -- centavos
  program_6_price INTEGER DEFAULT 220000 CHECK (program_6_price > 0), -- centavos
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected')),
  is_visible BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disponibilidad del profesional
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT availability_time_range CHECK (start_time < end_time)
);

-- Citas
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 50 CHECK (duration_minutes > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  session_type TEXT NOT NULL CHECK (session_type IN ('single', 'program_4', 'program_6')),
  video_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_type TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 1 CHECK (sessions > 0),
  notes TEXT,
  total_amount INTEGER CHECK (total_amount IS NULL OR total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notas clínicas
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'progress' CHECK (note_type IN ('progress', 'personal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. Índices para rendimiento
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_verification
  ON public.professional_profiles(verification_status, is_visible);

CREATE INDEX IF NOT EXISTS idx_availability_professional_day
  ON public.availability(professional_profile_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_appointments_patient
  ON public.appointments(patient_profile_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_professional
  ON public.appointments(professional_profile_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_quotes_email ON public.quotes(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_profile ON public.audit_logs(profile_id, created_at);

-- =============================================================================
-- 4. Funciones helper
-- =============================================================================

-- Actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verifica si un UUID es administrador
CREATE OR REPLACE FUNCTION public.is_admin(check_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Trigger atómico: crea el perfil (y subperfil de paciente/profesional)
-- justo después de que auth.users inserta un usuario.
-- Si alguna de estas inserciones falla, toda la transacción de Supabase Auth se revierte,
-- garantizando Atomicidad (no queda un usuario huérfano sin perfil).
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

  IF v_role NOT IN ('patient', 'professional', 'admin', 'support') THEN
    RAISE EXCEPTION 'Rol inválido: %', v_role;
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

-- =============================================================================
-- 5. Triggers
-- =============================================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_profiles_updated_at ON public.patient_profiles;
CREATE TRIGGER update_patient_profiles_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_professional_profiles_updated_at ON public.professional_profiles;
CREATE TRIGGER update_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinical_notes_updated_at ON public.clinical_notes;
CREATE TRIGGER update_clinical_notes_updated_at
  BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger en auth.users: cada nuevo usuario de Supabase Auth genera un perfil
-- en la misma transacción.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 6. Row Level Security (RLS)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
CREATE POLICY "Admins have full access on profiles" ON public.profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- patient_profiles
DROP POLICY IF EXISTS "Patients read own profile" ON public.patient_profiles;
CREATE POLICY "Patients read own profile" ON public.patient_profiles
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Professionals read assigned patients" ON public.patient_profiles;
CREATE POLICY "Professionals read assigned patients" ON public.patient_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.professional_profiles pp ON pp.id = a.professional_profile_id
      WHERE a.patient_profile_id = patient_profiles.id
        AND pp.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins have full access on patient_profiles" ON public.patient_profiles;
CREATE POLICY "Admins have full access on patient_profiles" ON public.patient_profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- professional_profiles
DROP POLICY IF EXISTS "Public can read verified professionals" ON public.professional_profiles;
CREATE POLICY "Public can read verified professionals" ON public.professional_profiles
  FOR SELECT USING (verification_status = 'verified' AND is_visible = true);

DROP POLICY IF EXISTS "Professionals can manage own profile" ON public.professional_profiles;
CREATE POLICY "Professionals can manage own profile" ON public.professional_profiles
  FOR ALL USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access on professional_profiles" ON public.professional_profiles;
CREATE POLICY "Admins have full access on professional_profiles" ON public.professional_profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- availability
DROP POLICY IF EXISTS "Professionals manage own availability" ON public.availability;
CREATE POLICY "Professionals manage own availability" ON public.availability
  FOR ALL USING (auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id));

DROP POLICY IF EXISTS "Admins have full access on availability" ON public.availability;
CREATE POLICY "Admins have full access on availability" ON public.availability
  FOR ALL USING (public.is_admin(auth.uid()));

-- appointments
DROP POLICY IF EXISTS "Patients read own appointments" ON public.appointments;
CREATE POLICY "Patients read own appointments" ON public.appointments
  FOR SELECT USING (auth.uid() = (SELECT profile_id FROM public.patient_profiles WHERE id = patient_profile_id));

DROP POLICY IF EXISTS "Patients create own appointments" ON public.appointments;
CREATE POLICY "Patients create own appointments" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = (SELECT profile_id FROM public.patient_profiles WHERE id = patient_profile_id));

DROP POLICY IF EXISTS "Professionals read own appointments" ON public.appointments;
CREATE POLICY "Professionals read own appointments" ON public.appointments
  FOR SELECT USING (auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id));

DROP POLICY IF EXISTS "Professionals update own appointments" ON public.appointments;
CREATE POLICY "Professionals update own appointments" ON public.appointments
  FOR UPDATE USING (auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id));

DROP POLICY IF EXISTS "Admins have full access on appointments" ON public.appointments;
CREATE POLICY "Admins have full access on appointments" ON public.appointments
  FOR ALL USING (public.is_admin(auth.uid()));

-- quotes
DROP POLICY IF EXISTS "Public can create quotes" ON public.quotes;
CREATE POLICY "Public can create quotes" ON public.quotes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Patients read own quotes" ON public.quotes;
CREATE POLICY "Patients read own quotes" ON public.quotes
  FOR SELECT USING (email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Admins manage quotes" ON public.quotes;
CREATE POLICY "Admins manage quotes" ON public.quotes
  FOR ALL USING (public.is_admin(auth.uid()));

-- clinical_notes
DROP POLICY IF EXISTS "Professionals read own notes" ON public.clinical_notes;
CREATE POLICY "Professionals read own notes" ON public.clinical_notes
  FOR ALL USING (auth.uid() = (SELECT profile_id FROM public.professional_profiles WHERE id = professional_profile_id));

DROP POLICY IF EXISTS "Admins have full access on clinical_notes" ON public.clinical_notes;
CREATE POLICY "Admins have full access on clinical_notes" ON public.clinical_notes
  FOR ALL USING (public.is_admin(auth.uid()));

-- audit_logs
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

COMMIT;
