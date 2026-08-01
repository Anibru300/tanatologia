import { supabase } from './supabase'

export type EmailPayload = {
  to: string
  subject: string
  html: string
  type: 'quote_confirmation' | 'appointment_confirmation' | 'other'
}

export async function sendEmail(payload: EmailPayload) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: payload,
  })

  if (error) {
    // Intentar leer el cuerpo de la respuesta para diagnóstico real
    let detail = ''
    try {
      const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context
      if (ctx?.json) detail = JSON.stringify(await ctx.json())
    } catch {
      /* sin cuerpo disponible */
    }
    console.error('[sendEmail] Error de la Edge Function:', error.message, detail)
    throw new Error(detail || error.message || 'Error enviando correo')
  }

  return data as { success: boolean; id: string; type: string }
}
