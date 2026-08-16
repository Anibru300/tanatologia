/**
 * Lógica pura de la ventana de acceso a una videollamada.
 * Separada de los componentes para poder probarla con Vitest.
 *
 * Reglas de negocio:
 * - La sala se abre EARLY_JOIN_MINUTES antes de la hora agendada.
 * - Se puede entrar hasta LATE_GRACE_MINUTES después de que termina la sesión.
 * - Citas canceladas, completadas o no-show nunca son accesibles.
 */

export const EARLY_JOIN_MINUTES = 15
export const LATE_GRACE_MINUTES = 15

export type SessionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface SessionTiming {
  scheduled_at: string
  duration_minutes: number
  status: SessionStatus
}

export type JoinWindowState = 'too_early' | 'joinable' | 'ended'

const MINUTE_MS = 60 * 1000

/** Minutos desde `now` hasta el inicio de la sesión (negativo si ya empezó). */
export function minutesUntilStart(session: SessionTiming, now: Date): number {
  return (new Date(session.scheduled_at).getTime() - now.getTime()) / MINUTE_MS
}

/** Timestamp (ms) en que termina la sesión, incluida la tolerancia final. */
export function sessionEndWithGrace(session: SessionTiming): number {
  return (
    new Date(session.scheduled_at).getTime() +
    session.duration_minutes * MINUTE_MS +
    LATE_GRACE_MINUTES * MINUTE_MS
  )
}

export function getJoinWindowState(session: SessionTiming, now: Date): JoinWindowState {
  if (session.status === 'cancelled' || session.status === 'completed' || session.status === 'no_show') {
    return 'ended'
  }
  if (now.getTime() > sessionEndWithGrace(session)) {
    return 'ended'
  }
  return minutesUntilStart(session, now) <= EARLY_JOIN_MINUTES ? 'joinable' : 'too_early'
}

export function isJoinable(session: SessionTiming, now: Date): boolean {
  return getJoinWindowState(session, now) === 'joinable'
}

/**
 * Filtra y ordena las próximas sesiones con acceso a sala: pendientes o
 * confirmadas que no hayan superado su tolerancia final, de más próxima a más lejana.
 */
export function filterUpcomingSessions<T extends SessionTiming>(
  sessions: T[],
  now: Date,
  limit = 5
): T[] {
  return sessions
    .filter(
      (s) =>
        (s.status === 'pending' || s.status === 'confirmed') &&
        now.getTime() <= sessionEndWithGrace(s)
    )
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, limit)
}

/**
 * Texto humano del tiempo que falta para la sesión: "en 2 días",
 * "en 3 h 20 min", "en 45 min" o "en menos de un minuto".
 */
export function formatTimeUntilStart(session: SessionTiming, now: Date): string {
  const ms = new Date(session.scheduled_at).getTime() - now.getTime()
  if (ms <= 0) return 'ahora'
  const totalMinutes = Math.floor(ms / MINUTE_MS)
  if (totalMinutes < 1) return 'en menos de un minuto'
  const days = Math.floor(totalMinutes / (60 * 24))
  if (days >= 1) return days === 1 ? 'en 1 día' : `en ${days} días`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 1) {
    return minutes > 0 ? `en ${hours} h ${minutes} min` : `en ${hours} h`
  }
  return `en ${totalMinutes} min`
}
