// Normalización de teléfonos a E.164 (México).
// Mismo algoritmo que la Edge Function whatsapp-notify (Meta Cloud API):
// mantener ambos en sincronía si cambia la lógica.

// Normaliza a E.164 mexicano: quita todo lo que no sea dígito o '+'.
// - Si ya trae '+', se respeta tal cual (cualquier país).
// - Si no, asume México: quita el prefijo de marcación 045/044/01 o el '0'
//   nacional, y acepta 10 dígitos (local), '1'+10 (celular) y '52'+10
//   (ya con lada país).
// Devuelve null si queda inválido (<10 o >15 dígitos).
export function normalizeMxPhone(input: string | null | undefined): string | null {
  if (!input) return null
  const cleaned = input.replace(/[^0-9+]/g, '')
  if (!cleaned) return null

  const hasPlus = cleaned.startsWith('+')
  let digits = cleaned.replace(/\D/g, '')
  if (!hasPlus) {
    // Prefijos de marcación mexicanos: 045/044 (celular) y 01 (larga distancia).
    if (digits.length === 13 && (digits.startsWith('045') || digits.startsWith('044'))) {
      digits = digits.slice(3)
    } else if (digits.length === 12 && digits.startsWith('01')) {
      digits = digits.slice(2)
    } else {
      digits = digits.replace(/^0+/, '')
    }
  }
  if (digits.length < 10 || digits.length > 15) return null

  if (hasPlus) return `+${digits}`
  if (digits.length === 10) return `+52${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+52${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`
  // 13-15 dígitos sin '+' y sin prefijo reconocido: no adivinar país.
  if (digits.length > 12) return null
  return `+52${digits}`
}

export function isValidMxPhone(input: string | null | undefined): boolean {
  return normalizeMxPhone(input) !== null
}
