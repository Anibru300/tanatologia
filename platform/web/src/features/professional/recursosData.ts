// Ofertas de formación/certificación de la sección Recursos del profesional.
// Cada oferta tiene VIGENCIA (YYYY-MM-DD inclusive, hora de Ciudad de México):
// pasada la fecha se muestra como "Finalizada": sin acceso a inscripción pero
// conservada como historial. El dashboard solo anuncia ofertas vigentes.

export type OfertaFormacion = {
  id: string
  titulo: string
  organizador: string
  descripcion: string
  vigencia: string // YYYY-MM-DD (incluido, hora de America/Mexico_City)
  detalles: { label: string; valor: string }[]
  costos: string
  pasos: string[]
  urlPrograma: string
  urlInscripcion: string
  inscripcionHint: string
}

export const FORMACION_OFERTAS: OfertaFormacion[] = [
  {
    id: 'fmp-mcc-2026',
    titulo: 'Certificación Institucional en Psicoterapia de Juego (MCC)',
    organizador: 'Federación Mexicana de Psicología, A.C. (FMP)',
    descripcion:
      'Aprende los fundamentos de la terapia de juego: desarrollo infantil y psicopatología, técnicas lúdicas, diseño y conducción de sesiones, trabajo con padres, evaluación y ética. Programa de 6 módulos.',
    vigencia: '2026-11-17',
    detalles: [
      { label: 'Inicio', valor: '17 de noviembre de 2026' },
      { label: 'Término', valor: '2 de febrero de 2027' },
      { label: 'Horario', valor: 'Martes y jueves, 6:00 a 9:00 p.m.' },
      { label: 'Modalidad', valor: 'Online sincrónico' },
    ],
    costos:
      'La capacitación es gratuita (beca del 100% en inscripción y mensualidades al adquirir el ejemplar). Al finalizar, de forma opcional, puedes solicitar constancia simplificada ($3,000 MXN) o el proceso de certificación ($5,000 MXN).',
    pasos: [
      'Adquiere el ejemplar desde la página de la beca.',
      'Envía por WhatsApp tu número de código, nombre completo y la certificación a la que te inscribes al 734 128 7563.',
      'Recibirás por WhatsApp las indicaciones para continuar tu inscripción.',
    ],
    urlPrograma: 'https://www.certificaciones.online/beca-juego',
    urlInscripcion: 'https://wa.me/527341287563',
    inscripcionHint: '734 128 7563',
  },
]

const TZ = 'America/Mexico_City'

/** Fecha local (CDMX) en formato YYYY-MM-DD. */
function hoyCDMX(ahora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(ahora)
}

/** true si la oferta sigue vigente (la vigencia es inclusive todo ese día, hora de CDMX). */
export function ofertaVigente(oferta: OfertaFormacion, ahora: Date = new Date()): boolean {
  return hoyCDMX(ahora) <= oferta.vigencia
}

/** Ofertas activas (para el dashboard y la sección principal). */
export function ofertasVigentes(ahora: Date = new Date()): OfertaFormacion[] {
  return FORMACION_OFERTAS.filter((o) => ofertaVigente(o, ahora))
}

/** Texto corto de vigencia para la UI, ej. "17 de noviembre de 2026". */
export function vigenciaLegible(oferta: OfertaFormacion): string {
  const d = new Date(`${oferta.vigencia}T12:00:00`)
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}
