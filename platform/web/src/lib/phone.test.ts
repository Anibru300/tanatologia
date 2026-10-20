import { describe, it, expect } from 'vitest'
import { normalizeMxPhone, isValidMxPhone } from './phone'

describe('normalizeMxPhone', () => {
  it('acepta 10 dígitos locales y agrega +52', () => {
    expect(normalizeMxPhone('5512345678')).toBe('+525512345678')
    expect(normalizeMxPhone('33 1234 5678')).toBe('+523312345678')
  })

  it('respeta el + explícito con cualquier código de país', () => {
    expect(normalizeMxPhone('+525512345678')).toBe('+525512345678')
    expect(normalizeMxPhone('+1 415 555 2671')).toBe('+14155552671')
    expect(normalizeMxPhone('+34 612 34 56 78')).toBe('+34612345678')
  })

  it('maneja prefijo interurbano 1 (045/044/01)', () => {
    expect(normalizeMxPhone('045 55 1234 5678')).toBe('+525512345678')
    expect(normalizeMxPhone('015512345678')).toBe('+525512345678')
  })

  it('respeta 52 ya presente sin +', () => {
    expect(normalizeMxPhone('525512345678')).toBe('+525512345678')
  })

  it('ignora guiones, paréntesis y espacios', () => {
    expect(normalizeMxPhone('(55) 1234-5678')).toBe('+525512345678')
    expect(normalizeMxPhone('+52 (55) 1234 5678')).toBe('+525512345678')
  })

  it('rechaza entradas inválidas', () => {
    expect(normalizeMxPhone('')).toBeNull()
    expect(normalizeMxPhone(null)).toBeNull()
    expect(normalizeMxPhone(undefined)).toBeNull()
    expect(normalizeMxPhone('abc')).toBeNull()
    expect(normalizeMxPhone('123')).toBeNull()
    expect(normalizeMxPhone('123456789')).toBeNull() // 9 dígitos
    expect(normalizeMxPhone('12345678901234')).toBeNull() // 14 sin prefijo reconocible
  })
})

describe('isValidMxPhone', () => {
  it('valida correctamente', () => {
    expect(isValidMxPhone('5512345678')).toBe(true)
    expect(isValidMxPhone('+525512345678')).toBe(true)
    expect(isValidMxPhone('')).toBe(false)
    expect(isValidMxPhone('12345')).toBe(false)
  })
})
