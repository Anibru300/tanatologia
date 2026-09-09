import { supabase } from '@/lib/supabase'

export type DailyRoom = {
  /** URL completa de la sala Daily Prebuilt (para iframe o pestaña nueva). */
  url: string
  name: string
}

export type DailyRoomResult = {
  room: DailyRoom | null
  /** Motivo del fallo para mostrarlo en UI/log; null si hubo sala. */
  reason: string | null
}

function statusOf(error: unknown): number | null {
  // FunctionsHttpError expone el Response en `context`; otros errores no.
  const ctx = (error as { context?: Response })?.context
  return ctx && typeof ctx.status === 'number' ? ctx.status : null
}

/**
 * Pide a la Edge Function `daily-test-room` una sala de prueba de Daily.co.
 * NUNCA lanza. Solo administradores (403 en otro caso); sin el secret
 * DAILY_API_KEY configurado responde 501 y la UI explica cómo activarlo.
 */
export async function createDailyTestRoom(): Promise<DailyRoomResult> {
  try {
    const { data, error } = await supabase.functions.invoke('daily-test-room', {
      body: {},
    })
    if (error) {
      const status = statusOf(error)
      const reason =
        status === 401 ? 'sesión expirada (401)' :
        status === 403 ? 'se requiere rol de administrador (403)' :
        status === 501 ? 'Daily no configurado (501)' :
        status === 502 ? `error del API de Daily (502): ${extractDetail(error)}` :
        status ? `error ${status}` : error.message ?? 'error de red'
      return { room: null, reason }
    }
    if (!data?.url || !data?.name) {
      return { room: null, reason: 'respuesta incompleta de daily-test-room' }
    }
    return {
      room: { url: String(data.url), name: String(data.name) },
      reason: null,
    }
  } catch (e) {
    return { room: null, reason: e instanceof Error ? e.message : 'error de red' }
  }
}

function extractDetail(error: unknown): string {
  const ctx = (error as { context?: Response })?.context
  // El detalle viene en el body JSON del 502; sin re-leerlo, mensaje genérico.
  return ctx ? '' : (error as Error)?.message ?? ''
}
