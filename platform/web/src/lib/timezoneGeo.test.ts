import { describe, it, expect } from 'vitest'
import { geoFromTimezone } from './timezoneGeo'

describe('geoFromTimezone', () => {
  it('mapea zonas de México', () => {
    expect(geoFromTimezone('America/Mexico_City')).toEqual({ country: 'México', city: 'Ciudad de México' })
    expect(geoFromTimezone('America/Monterrey')).toEqual({ country: 'México', city: 'Monterrey' })
  })

  it('mapea zonas de otros países', () => {
    expect(geoFromTimezone('Europe/Madrid').country).toBe('España')
    expect(geoFromTimezone('America/Bogota').country).toBe('Colombia')
    expect(geoFromTimezone('America/New_York').country).toBe('EE. UU.')
  })

  it('null/undefined/vacío → Desconocido', () => {
    expect(geoFromTimezone(null)).toEqual({ country: 'Desconocido', city: 'Desconocido' })
    expect(geoFromTimezone(undefined)).toEqual({ country: 'Desconocido', city: 'Desconocido' })
    expect(geoFromTimezone('')).toEqual({ country: 'Desconocido', city: 'Desconocido' })
  })

  it('zona no listada → Otro', () => {
    expect(geoFromTimezone('Antarctica/Palmer')).toEqual({ country: 'Otro', city: '—' })
  })
})
