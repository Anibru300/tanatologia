import { describe, expect, it } from 'vitest'
import { FORMACION_OFERTAS, ofertaVigente, ofertasVigentes, vigenciaLegible } from './recursosData'

// Hora de referencia: mediodía de Ciudad de México (evita límites de día).
const enCDMX = (fecha: string) => new Date(`${fecha}T12:00:00-06:00`)

describe('ofertaVigente', () => {
  const oferta = FORMACION_OFERTAS[0] // vigencia 2026-11-17

  it('está vigente antes y durante el día de vigencia', () => {
    expect(ofertaVigente(oferta, enCDMX('2026-10-27'))).toBe(true)
    expect(ofertaVigente(oferta, enCDMX('2026-11-17'))).toBe(true)
  })

  it('finaliza el día después de la vigencia', () => {
    expect(ofertaVigente(oferta, enCDMX('2026-11-18'))).toBe(false)
    expect(ofertaVigente(oferta, enCDMX('2027-01-01'))).toBe(false)
  })

  it('respeta el límite por hora de Ciudad de México (no la UTC)', () => {
    // 23:30 del 17-nov en CDMX = 05:30 UTC del 18 → sigue vigente
    const ultimaHora = new Date('2026-11-18T05:30:00Z')
    expect(ofertaVigente(oferta, ultimaHora)).toBe(true)
    // 01:00 del 18-nov en CDMX = 07:00 UTC → ya finalizó
    const yaPasada = new Date('2026-11-18T07:00:00Z')
    expect(ofertaVigente(oferta, yaPasada)).toBe(false)
  })
})

describe('ofertasVigentes / vigenciaLegible', () => {
  it('solo devuelve las vigentes', () => {
    expect(ofertasVigentes(enCDMX('2026-11-18'))).toHaveLength(0)
    expect(ofertasVigentes(enCDMX('2026-11-01'))).toHaveLength(FORMACION_OFERTAS.length)
  })

  it('formatea la fecha de vigencia en español', () => {
    expect(vigenciaLegible(FORMACION_OFERTAS[0])).toContain('noviembre')
    expect(vigenciaLegible(FORMACION_OFERTAS[0])).toContain('2026')
  })
})
