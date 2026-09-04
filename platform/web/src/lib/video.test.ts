import { describe, expect, it } from 'vitest'
import { generateJitsiRoomName, getJitsiDomain, getJitsiRoomUrl } from './video'

describe('generateJitsiRoomName', () => {
  it('usa el prefijo de la marca', () => {
    expect(generateJitsiRoomName()).toMatch(/^somos-calma-/)
  })

  it('genera nombres únicos en cada llamada', () => {
    const names = new Set(Array.from({ length: 50 }, () => generateJitsiRoomName()))
    expect(names.size).toBe(50)
  })

  it('no incluye el appointmentId en el nombre (evita salas predecibles)', () => {
    const name = generateJitsiRoomName('cita-123')
    expect(name).not.toContain('cita-123')
  })

  it('genera un identificador suficientemente largo para no ser adivinable', () => {
    const id = generateJitsiRoomName().replace('somos-calma-', '')
    expect(id.length).toBeGreaterThanOrEqual(24)
  })
})

describe('dominio Jitsi', () => {
  it('usa meet.jit.si por defecto', () => {
    expect(getJitsiDomain()).toBe('meet.jit.si')
  })

  it('construye la URL completa de la sala', () => {
    expect(getJitsiRoomUrl('somos-calma-abc')).toBe('https://meet.jit.si/somos-calma-abc')
  })

  it('con JaaS prefija el appId y agrega el JWT como query param', () => {
    const url = getJitsiRoomUrl('somos-calma-abc', {
      appId: 'vpaas-magic-cookie-xxx',
      jwt: 'eyJ.hbGci.abc+/=',
    })
    expect(url).toBe(
      'https://meet.jit.si/vpaas-magic-cookie-xxx/somos-calma-abc?jwt=eyJ.hbGci.abc%2B%2F%3D',
    )
  })

  it('sin appId no prefija la sala aunque haya JWT', () => {
    const url = getJitsiRoomUrl('somos-calma-abc', { jwt: 'tok' })
    expect(url).toBe('https://meet.jit.si/somos-calma-abc?jwt=tok')
  })
})
