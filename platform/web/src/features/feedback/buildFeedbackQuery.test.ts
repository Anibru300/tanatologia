import { describe, expect, it } from 'vitest'
import { buildFeedbackQuery } from './buildFeedbackQuery'

describe('buildFeedbackQuery', () => {
  it('sin filtros devuelve una consulta sin condiciones', () => {
    const spec = buildFeedbackQuery({})

    expect(spec.filters).toEqual([])
    expect(spec.order).toEqual({ column: 'created_at', ascending: false })
    expect(spec.limit).toBe(500)
  })

  it('combina varios filtros como condiciones eq', () => {
    const spec = buildFeedbackQuery({
      role: 'patient',
      type: 'issue',
      status: 'new',
    })

    expect(spec.filters).toEqual([
      { column: 'role', op: 'eq', value: 'patient' },
      { column: 'type', op: 'eq', value: 'issue' },
      { column: 'status', op: 'eq', value: 'new' },
    ])
  })

  it('mapea dateFrom/dateTo a gte/lte sobre created_at', () => {
    const spec = buildFeedbackQuery({
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-01-31T23:59:59.999Z',
    })

    expect(spec.filters).toEqual([
      { column: 'created_at', op: 'gte', value: '2026-01-01T00:00:00.000Z' },
      { column: 'created_at', op: 'lte', value: '2026-01-31T23:59:59.999Z' },
    ])
  })

  it('respeta el orden de filtros: eq primero, fechas después', () => {
    const spec = buildFeedbackQuery({
      dateFrom: '2026-06-01',
      role: 'professional',
    })

    expect(spec.filters).toEqual([
      { column: 'role', op: 'eq', value: 'professional' },
      { column: 'created_at', op: 'gte', value: '2026-06-01' },
    ])
  })
})
