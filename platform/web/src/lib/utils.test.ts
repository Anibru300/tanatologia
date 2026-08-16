import { describe, expect, it } from 'vitest'
import { cn, formatCurrency } from './utils'

describe('cn', () => {
  it('combina clases y resuelve conflictos de Tailwind', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-text', undefined, 'font-bold')).toBe('text-text font-bold')
  })
})

describe('formatCurrency', () => {
  it('formatea montos en pesos mexicanos sin decimales', () => {
    expect(formatCurrency(1200)).toContain('1,200')
    expect(formatCurrency(1200)).toContain('$')
    expect(formatCurrency(0)).toContain('0')
  })
})
