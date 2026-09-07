import { supabase } from '@/lib/supabase'

export type JaasToken = {
  jwt: string
  appId: string
  domain: string
  moderator: boolean
}

export type JaasResult = {
  /** Token JaaS, o null cuando no se pudo obtener (fallback a meet.jit.si). */
  token: JaasToken | null
  /** Motivo del fallo para mostrarlo en UI/log; null si hubo token. */
  reason: string | null
}

function statusOf(error: unknown): number | null {
  // FunctionsHttpError expone el Response en `context`; otros errores no.
  const ctx = (error as { context?: Response })?.context
  return ctx && typeof ctx.status === 'number' ? ctx.status : null
}

/**
 * Pide a la Edge Function `jaas-token` un JWT para la sala de la cita.
 * NUNCA lanza: el llamador usa meet.jit.si como fallback, pero ahora con
 * el motivo del fallo para mostrarlo (antes el fallback era silencioso y
 * las sesiones morían a los 5 min sin que nadie supiera por qué).
 */
export async function fetchJaasToken(appointmentId: string): Promise<JaasResult> {
  try {
    const { data, error } = await supabase.functions.invoke('jaas-token', {
      body: { appointmentId },
    })
    if (error) {
      const status = statusOf(error)
      const reason =
        status === 401 ? 'sesión expirada (401)' :
        status === 404 ? 'cita no encontrada (404)' :
        status === 409 ? 'la cita no está activa (409)' :
        status === 501 ? 'JaaS no configurado (501)' :
        status ? `error ${status}` : error.message ?? 'error de red'
      return { token: null, reason }
    }
    if (!data?.jwt || !data?.appId || !data?.domain) {
      return { token: null, reason: 'respuesta incompleta de jaas-token' }
    }
    return {
      token: {
        jwt: String(data.jwt),
        appId: String(data.appId),
        domain: String(data.domain),
        moderator: Boolean(data.moderator),
      },
      reason: null,
    }
  } catch (e) {
    return { token: null, reason: e instanceof Error ? e.message : 'error de red' }
  }
}
