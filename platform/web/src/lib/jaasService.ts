import { supabase } from '@/lib/supabase'

export type JaasToken = {
  jwt: string
  appId: string
  domain: string
  moderator: boolean
}

/**
 * Pide a la Edge Function `jaas-token` un JWT para la sala de la cita.
 * Devuelve null cuando JaaS no está configurado (501) o cualquier otro
 * fallo: el llamador usa entonces meet.jit.si en modo gratuito (fallback).
 */
export async function fetchJaasToken(appointmentId: string): Promise<JaasToken | null> {
  try {
    const { data, error } = await supabase.functions.invoke('jaas-token', {
      body: { appointmentId },
    })
    if (error || !data?.jwt || !data?.appId || !data?.domain) return null
    return {
      jwt: String(data.jwt),
      appId: String(data.appId),
      domain: String(data.domain),
      moderator: Boolean(data.moderator),
    }
  } catch {
    return null
  }
}
