import { describe, expect, it } from 'vitest'
import {
  EARLY_JOIN_MINUTES,
  LATE_GRACE_MINUTES,
  filterUpcomingSessions,
  formatTimeUntilStart,
  getJoinWindowState,
  isJoinable,
  minutesUntilStart,
  sessionEndWithGrace,
  type SessionTiming,
} from './videoSession'

const MINUTE = 60 * 1000
const NOW = new Date('2026-08-16T12:00:00')

function session(offsetMinutes: number, overrides: Partial<SessionTiming> = {}): SessionTiming {
  return {
    scheduled_at: new Date(NOW.getTime() + offsetMinutes * MINUTE).toISOString(),
    duration_minutes: 50,
    status: 'confirmed',
    ...overrides,
  }
}

describe('getJoinWindowState', () => {
  it('bloquea la entrada antes de la ventana anticipada', () => {
    expect(getJoinWindowState(session(EARLY_JOIN_MINUTES + 1), NOW)).toBe('too_early')
  })

  it('abre la sala exactamente EARLY_JOIN_MINUTES antes', () => {
    expect(getJoinWindowState(session(EARLY_JOIN_MINUTES), NOW)).toBe('joinable')
  })

  it('permite entrar durante la sesión', () => {
    expect(getJoinWindowState(session(-25), NOW)).toBe('joinable')
  })

  it('permite entrar hasta el final de la tolerancia posterior', () => {
    const s = session(0)
    const atGraceEnd = new Date(sessionEndWithGrace(s))
    expect(getJoinWindowState(s, atGraceEnd)).toBe('joinable')
    expect(getJoinWindowState(s, new Date(atGraceEnd.getTime() + 1))).toBe('ended')
  })

  it.each(['cancelled', 'completed', 'no_show'] as const)(
    'nunca permite entrar a una cita %s',
    (status) => {
      expect(getJoinWindowState(session(0, { status }), NOW)).toBe('ended')
    }
  )

  it('las citas pendientes también son accesibles en su ventana', () => {
    expect(isJoinable(session(5, { status: 'pending' }), NOW)).toBe(true)
  })
})

describe('filterUpcomingSessions', () => {
  it('ordena de más próxima a más lejana y descarta las terminadas', () => {
    const later = session(120)
    const soon = session(30)
    const past = session(-(50 + LATE_GRACE_MINUTES + 5)) // terminó con tolerancia incluida
    const cancelled = session(60, { status: 'cancelled' })

    const result = filterUpcomingSessions([later, past, soon, cancelled], NOW)

    expect(result).toEqual([soon, later])
  })

  it('mantiene dentro de la lista una sesión en curso', () => {
    const ongoing = session(-10)
    expect(filterUpcomingSessions([ongoing], NOW)).toEqual([ongoing])
  })

  it('respeta el límite', () => {
    const many = [session(10), session(20), session(30), session(40)]
    expect(filterUpcomingSessions(many, NOW, 2)).toHaveLength(2)
  })
})

describe('formatTimeUntilStart', () => {
  it('formatea minutos, horas y días en español', () => {
    expect(formatTimeUntilStart(session(45), NOW)).toBe('en 45 min')
    expect(formatTimeUntilStart(session(200), NOW)).toBe('en 3 h 20 min')
    expect(formatTimeUntilStart(session(60), NOW)).toBe('en 1 h')
    expect(formatTimeUntilStart(session(60 * 24), NOW)).toBe('en 1 día')
    expect(formatTimeUntilStart(session(60 * 24 * 3), NOW)).toBe('en 3 días')
    expect(formatTimeUntilStart(session(0.4), NOW)).toBe('en menos de un minuto')
    expect(formatTimeUntilStart(session(-5), NOW)).toBe('ahora')
  })
})

describe('minutesUntilStart', () => {
  it('devuelve minutos positivos antes y negativos después del inicio', () => {
    expect(minutesUntilStart(session(10), NOW)).toBeCloseTo(10)
    expect(minutesUntilStart(session(-10), NOW)).toBeCloseTo(-10)
  })
})
