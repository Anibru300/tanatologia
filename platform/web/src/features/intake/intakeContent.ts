// Contenido de la encuesta de registro del paciente.
// Diseño basado en: buenas prácticas de intake de plataformas de terapia online
// (cuestionario de matching, separado del tamizaje clínico) + instrumentos
// validados en español: PHQ-9 (Kroenke et al., 2001) y GAD-7 (Spitzer et al., 2006),
// ambos de dominio público y validados en población mexicana.
// Ver: docs/encuesta-matching-investigacion.md

export type IntakeData = {
  // Bloque A — matching
  needType: string | null
  topics: string[]
  therapistGender: string | null
  preferredTime: string | null
  firstTherapy: string | null
  reasonText: string
  // Bloque B — tamizaje opcional
  screeningDone: boolean
  phq9: number[] // 9 valores 0-3
  gad7: number[] // 7 valores 0-3
}

export const NEED_TYPES = [
  {
    value: 'salud_mental',
    label: 'Apoyo emocional / salud mental',
    hint: 'Ansiedad, depresión, estrés, autoestima…',
    specialties: ['Ansiedad', 'Depresión', 'Psicología clínica', 'Estrés'],
  },
  {
    value: 'duelo',
    label: 'Duelo por la muerte de un ser querido',
    hint: 'Pérdida reciente o duelo prolongado',
    specialties: ['Duelo', 'Tanatología'],
  },
  {
    value: 'perdida',
    label: 'Pérdida no mortuoria',
    hint: 'Separación, divorcio, cambios de vida',
    specialties: ['Duelo', 'Tanatología', 'Terapia de pareja'],
  },
  {
    value: 'enfermedad',
    label: 'Acompañamiento en enfermedad o fin de vida',
    hint: 'Propia o de un ser querido',
    specialties: ['Tanatología', 'Acompañamiento en enfermedad terminal', 'Cuidados paliativos'],
  },
  {
    value: 'educativa',
    label: 'Orientación educativa / otra',
    hint: 'Orientación vocacional, familiar u otro tema',
    specialties: ['Psicología clínica'],
  },
] as const

export const TOPIC_OPTIONS = [
  { value: 'ansiedad', label: 'Ansiedad', specialties: ['Ansiedad', 'Psicología clínica'] },
  { value: 'estres', label: 'Estrés', specialties: ['Ansiedad', 'Psicología clínica'] },
  { value: 'depresion', label: 'Depresión o tristeza profunda', specialties: ['Depresión', 'Psicología clínica'] },
  { value: 'duelo_muerte', label: 'Duelo por una muerte', specialties: ['Duelo', 'Tanatología'] },
  { value: 'perdida_separacion', label: 'Pérdida o separación', specialties: ['Duelo', 'Tanatología', 'Terapia de pareja'] },
  { value: 'enfermedad', label: 'Enfermedad propia o de un ser querido', specialties: ['Tanatología', 'Cuidados paliativos'] },
  { value: 'autoestima', label: 'Autoestima', specialties: ['Psicología clínica'] },
  { value: 'familia', label: 'Relaciones familiares', specialties: ['Terapia familiar', 'Psicología clínica'] },
  { value: 'cambios', label: 'Cambios de vida', specialties: ['Psicología clínica', 'Tanatología'] },
  { value: 'otro', label: 'Otro', specialties: [] },
] as const

export const GENDER_OPTIONS = [
  { value: 'mujer', label: 'Mujer' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'indiferente', label: 'Me es indiferente' },
] as const

export const TIME_OPTIONS = [
  { value: 'manana', label: 'Mañana (8:00–12:00)' },
  { value: 'tarde', label: 'Tarde (12:00–18:00)' },
  { value: 'noche', label: 'Noche (18:00–21:00)' },
  { value: 'flexible', label: 'Flexible' },
] as const

export const FIRST_THERAPY_OPTIONS = [
  { value: 'si', label: 'Sí, es mi primera vez' },
  { value: 'no', label: 'No, ya he estado en terapia antes' },
] as const

// PHQ-9 (dominio público; traducción oficial al español de PRIME-MD)
export const PHQ9_ITEMS = [
  'Poco interés o placer en hacer cosas',
  'Se ha sentido decaído/a, deprimido/a o sin esperanzas',
  'Con problemas para dormir o ha dormido demasiado',
  'Se ha sentido cansado/a o con poca energía',
  'Con poco apetito o ha comido en exceso',
  'Se ha sentido mal con usted mismo/a, como haberle fallado a su familia o haberse decepcionado a sí mismo/a',
  'Con dificultad para concentrarse en cosas como leer el periódico o ver televisión',
  'Se ha movido o hablado tan lento que otras personas podrían haberlo notado, o lo contrario: tan inquieto/a o agitado/a que se ha estado moviendo mucho más de lo normal',
  'Pensamientos de que estaría mejor muerto/a o de lastimarse de alguna manera',
] as const

// GAD-7 (dominio público)
export const GAD7_ITEMS = [
  'Se ha sentido nervioso/a, ansioso/a o con los nervios de punta',
  'No ha podido dejar de preocuparse',
  'Se ha preocupado demasiado por diferentes cosas',
  'Le ha costado trabajo relajarse',
  'Se ha sentido tan inquieto/a que no ha podido quedarse quieto/a',
  'Se ha molestado o irritado fácilmente',
  'Ha sentido miedo como si algo terrible fuera a pasar',
] as const

export const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Varios días' },
  { value: 2, label: 'Más de la mitad de los días' },
  { value: 3, label: 'Casi todos los días' },
] as const

export function scorePhq9(answers: number[]): number {
  return answers.reduce((a, b) => a + (b || 0), 0)
}

export function scoreGad7(answers: number[]): number {
  return answers.reduce((a, b) => a + (b || 0), 0)
}

export function phq9Level(score: number): string {
  if (score <= 4) return 'Mínimo'
  if (score <= 9) return 'Leve'
  if (score <= 14) return 'Moderado'
  if (score <= 19) return 'Moderadamente severo'
  return 'Severo'
}

export function gad7Level(score: number): string {
  if (score <= 4) return 'Mínimo'
  if (score <= 9) return 'Leve'
  if (score <= 14) return 'Moderado'
  return 'Severo'
}

/** Especialidades sugeridas para filtrar el directorio a partir de la encuesta. */
export function suggestedSpecialties(data: IntakeData): string[] {
  const set = new Set<string>()
  const need = NEED_TYPES.find((n) => n.value === data.needType)
  need?.specialties.forEach((s) => set.add(s))
  for (const topic of data.topics) {
    const t = TOPIC_OPTIONS.find((o) => o.value === topic)
    t?.specialties.forEach((s) => set.add(s))
  }
  return [...set]
}
