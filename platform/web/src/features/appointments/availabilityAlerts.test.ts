import { describe, expect, it } from 'vitest'
import { isValidAlertEmail } from './availabilityAlertsService'

describe('isValidAlertEmail', () => {
  it('acepta correos válidos en minúsculas y mayúsculas', () => {
    expect(isValidAlertEmail('ana@example.com')).toBe(true)
    expect(isValidAlertEmail('  Ana.Perez+1@Mail.COM ')).toBe(true)
  })

  it('rechaza correos sin dominio o TLD', () => {
    expect(isValidAlertEmail('ana@example')).toBe(false)
    expect(isValidAlertEmail('ana@')).toBe(false)
    expect(isValidAlertEmail('@example.com')).toBe(false)
    expect(isValidAlertEmail('ana example.com')).toBe(false)
  })

  it('rechaza cadenas vacías y caracteres prohibidos', () => {
    expect(isValidAlertEmail('')).toBe(false)
    expect(isValidAlertEmail('   ')).toBe(false)
    expect(isValidAlertEmail('a<b>@example.com')).toBe(false)
  })

  it('rechaza correos demasiado largos (>254 caracteres)', () => {
    expect(isValidAlertEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })
})
