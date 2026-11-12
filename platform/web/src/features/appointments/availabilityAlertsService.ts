import { supabase } from '@/lib/supabase'

// "Avísame cuando abra agenda" (migración 039): el paciente (o un visitante
// anónimo del sitio estático) deja su correo y, cuando el profesional publica
// su primera disponibilidad, availability-notify le envía el aviso (one-shot).
// Los altas pasan SOLO por la Edge Function availability-alert (la tabla no
// acepta inserts directos por RLS).

export function isValidAlertEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase()
  return trimmed.length <= 254 && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed)
}

export async function createAvailabilityAlert(
  professionalProfileId: string,
  email: string,
): Promise<{ duplicate: boolean }> {
  if (!isValidAlertEmail(email)) {
    throw new Error('Ingresa un correo válido.')
  }

  const { data, error } = await supabase.functions.invoke('availability-alert', {
    body: { professional_profile_id: professionalProfileId, email: email.trim().toLowerCase() },
  })

  if (error) {
    throw new Error('No se pudo guardar tu solicitud. Intenta de nuevo más tarde.')
  }
  return { duplicate: Boolean((data as { duplicate?: boolean } | null)?.duplicate) }
}

// Cuántos pacientes esperan a que ESTE profesional publique horarios
// (RLS 039: el profesional solo lee sus propias alertas).
export async function getPendingAlertCount(professionalProfileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('availability_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('professional_profile_id', professionalProfileId)
    .is('notified_at', null)

  if (error) {
    console.error('getPendingAlertCount:', error.message)
    return 0
  }
  return count ?? 0
}
