// Mapea zonas horarias IANA a país/ciudad para el panel "Flujo de la página".
// Aproximación deliberada: usamos la zona horaria del navegador (sin IP), suficiente
// para responder "¿de dónde nos visitan / se registran?" a nivel país y ciudad principal.

export type Geo = { country: string; city: string }

const UNKNOWN: Geo = { country: 'Desconocido', city: 'Desconocido' }

const TZ_GEO: Record<string, Geo> = {
  // México
  'America/Mexico_City': { country: 'México', city: 'Ciudad de México' },
  'America/Guadalajara': { country: 'México', city: 'Guadalajara' },
  'America/Monterrey': { country: 'México', city: 'Monterrey' },
  'America/Tijuana': { country: 'México', city: 'Tijuana' },
  'America/Cancun': { country: 'México', city: 'Cancún' },
  'America/Merida': { country: 'México', city: 'Mérida' },
  'America/Chihuahua': { country: 'México', city: 'Chihuahua' },
  'America/Hermosillo': { country: 'México', city: 'Hermosillo' },
  'America/Mazatlan': { country: 'México', city: 'Mazatlán' },
  'America/Matamoros': { country: 'México', city: 'Matamoros' },
  // Resto de Latinoamérica
  'America/Bogota': { country: 'Colombia', city: 'Bogotá' },
  'America/Lima': { country: 'Perú', city: 'Lima' },
  'America/Santiago': { country: 'Chile', city: 'Santiago' },
  'America/Buenos_Aires': { country: 'Argentina', city: 'Buenos Aires' },
  'America/Caracas': { country: 'Venezuela', city: 'Caracas' },
  'America/Guayaquil': { country: 'Ecuador', city: 'Guayaquil' },
  'America/La_Paz': { country: 'Bolivia', city: 'La Paz' },
  'America/Asuncion': { country: 'Paraguay', city: 'Asunción' },
  'America/Montevideo': { country: 'Uruguay', city: 'Montevideo' },
  'America/Sao_Paulo': { country: 'Brasil', city: 'São Paulo' },
  'America/Panama': { country: 'Panamá', city: 'Ciudad de Panamá' },
  'America/Costa_Rica': { country: 'Costa Rica', city: 'San José' },
  'America/Guatemala': { country: 'Guatemala', city: 'Ciudad de Guatemala' },
  'America/El_Salvador': { country: 'El Salvador', city: 'San Salvador' },
  'America/Tegucigalpa': { country: 'Honduras', city: 'Tegucigalpa' },
  'America/Managua': { country: 'Nicaragua', city: 'Managua' },
  'America/Havana': { country: 'Cuba', city: 'La Habana' },
  'America/Santo_Domingo': { country: 'Rep. Dominicana', city: 'Santo Domingo' },
  'America/Puerto_Rico': { country: 'Puerto Rico', city: 'San Juan' },
  // Estados Unidos y Canadá
  'America/New_York': { country: 'EE. UU.', city: 'Nueva York' },
  'America/Chicago': { country: 'EE. UU.', city: 'Chicago' },
  'America/Denver': { country: 'EE. UU.', city: 'Denver' },
  'America/Los_Angeles': { country: 'EE. UU.', city: 'Los Ángeles' },
  'America/Phoenix': { country: 'EE. UU.', city: 'Phoenix' },
  'America/Anchorage': { country: 'EE. UU.', city: 'Anchorage' },
  'Pacific/Honolulu': { country: 'EE. UU.', city: 'Honolulu' },
  'America/Toronto': { country: 'Canadá', city: 'Toronto' },
  'America/Vancouver': { country: 'Canadá', city: 'Vancouver' },
  'America/Winnipeg': { country: 'Canadá', city: 'Winnipeg' },
  'America/Halifax': { country: 'Canadá', city: 'Halifax' },
  // Europa
  'Europe/Madrid': { country: 'España', city: 'Madrid' },
  'Atlantic/Canary': { country: 'España', city: 'Canarias' },
  'Europe/London': { country: 'Reino Unido', city: 'Londres' },
  'Europe/Paris': { country: 'Francia', city: 'París' },
  'Europe/Berlin': { country: 'Alemania', city: 'Berlín' },
  'Europe/Rome': { country: 'Italia', city: 'Roma' },
  'Europe/Lisbon': { country: 'Portugal', city: 'Lisboa' },
  'Europe/Amsterdam': { country: 'Países Bajos', city: 'Ámsterdam' },
  // Resto del mundo
  'Asia/Tokyo': { country: 'Japón', city: 'Tokio' },
  'Australia/Sydney': { country: 'Australia', city: 'Sídney' },
  'Australia/Melbourne': { country: 'Australia', city: 'Melbourne' },
}

export function geoFromTimezone(timezone: string | null | undefined): Geo {
  if (!timezone) return UNKNOWN
  return TZ_GEO[timezone] ?? { country: 'Otro', city: '—' }
}
