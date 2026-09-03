-- 011_security_hardening.sql — Auditoría real + Storage restringido por rol
-- Aplicar en Supabase (SQL Editor o `supabase db query --linked -f ...`).
BEGIN;

-- ============ 1. audit_logs: escritores automáticos ============
-- Antes de esta migración audit_logs era una tabla "muerta" (nadie escribía).
-- Función genérica: registra quién (profile_id), qué tabla, qué registro y
-- el nuevo estado. Se dispara solo cuando cambian columnas sensibles.
CREATE OR REPLACE FUNCTION public.audit_sensitive_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (profile_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

-- professional_profiles: solo cuando cambian verificación, visibilidad o rating
DROP TRIGGER IF EXISTS audit_professional_profiles ON public.professional_profiles;
CREATE TRIGGER audit_professional_profiles
  AFTER INSERT OR UPDATE OF verification_status, is_visible, rating, rejection_reason
  ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

-- professional_documents: solo cuando cambia el estatus de revisión
DROP TRIGGER IF EXISTS audit_professional_documents ON public.professional_documents;
CREATE TRIGGER audit_professional_documents
  AFTER INSERT OR UPDATE OF status, reviewed_by, rejection_reason
  ON public.professional_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

-- appointments: solo cuando cambia el estatus de la cita
DROP TRIGGER IF EXISTS audit_appointments ON public.appointments;
CREATE TRIGGER audit_appointments
  AFTER INSERT OR UPDATE OF status
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

-- feedback: solo cuando cambia el estatus (gestión admin)
DROP TRIGGER IF EXISTS audit_feedback ON public.feedback;
CREATE TRIGGER audit_feedback
  AFTER INSERT OR UPDATE OF status
  ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_change();

-- ============ 2. Storage: solo profesionales suben documentos ============
-- Antes cualquier usuario autenticado (incluido un paciente) podía escribir en
-- su carpeta del bucket privado. Ahora se exige rol professional o admin.
DROP POLICY IF EXISTS "Professionals upload own documents" ON storage.objects;
CREATE POLICY "Professionals upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'professional-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      EXISTS (
        SELECT 1 FROM public.professional_profiles
        WHERE profile_id = auth.uid()
      )
      OR public.is_admin(auth.uid())
    )
  );

COMMIT;
