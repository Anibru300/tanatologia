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
    throw new Error(error.message || 'Error enviando correo')
  }

  return data as { success: boolean; id: string; type: string }
}
