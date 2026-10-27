// Registro de aceptaciones legales (evidencia).
// La tabla `legal_acceptances` existe desde la migración 005 con RLS: cada
// usuario solo puede insertar/leer sus propias aceptaciones. Aquí se guarda
// QUÉ versión de cada documento aceptó al registrarse (checkbox único del
// registro que cubre aviso + términos + consentimiento de datos sensibles).
// Las fechas deben cuadrar con la fecha de "Última actualización" de cada
// página estática (pages/aviso-privacidad.html, pages/terminos.html).
// Best-effort: un fallo aquí NUNCA debe romper el registro.

import { supabase } from '@/lib/supabase'

export const LEGAL_DOC_VERSIONS = {
  privacy_notice: '2026-10-03',
  terms: '2026-09-03',
  sensitive_data_consent: '2026-10-03',
} as const

/**
 * Guarda las aceptaciones del checkbox de registro (aviso de privacidad,
 * términos y consentimiento de datos sensibles) para el usuario autenticado
 * actual. Idempotente (ignoreDuplicates) y silenciosa ante errores.
 */
export async function recordSignupAcceptances(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date().toISOString()
    const rows = (Object.keys(LEGAL_DOC_VERSIONS) as (keyof typeof LEGAL_DOC_VERSIONS)[]).map(
      (documentType) => ({
        profile_id: user.id,
        document_type: documentType,
        document_version: LEGAL_DOC_VERSIONS[documentType],
        accepted_at: now,
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }),
    )

    const { error } = await supabase
      .from('legal_acceptances')
      .upsert(rows, { onConflict: 'profile_id,document_type,document_version', ignoreDuplicates: true })

    if (error) {
      console.error('legal_acceptances:', error.message)
    }
  } catch (err) {
    console.error('legal_acceptances:', err)
  }
}
