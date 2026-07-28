import { supabase } from '@/lib/supabase'
import { getProfessionalProfileId } from '@/features/appointments/appointmentsService'

export type AvailabilityRange = {
  id: string
  professional_profile_id: string
  day_of_week: number // 0 = domingo ... 6 = sábado
  start_time: string // 'HH:mm'
  end_time: string // 'HH:mm'
}

export type AvailabilityRangeInput = {
  day_of_week: number
  start_time: string // 'HH:mm'
  end_time: string // 'HH:mm'
}

// Postgres devuelve columnas `time` como 'HH:mm:ss'; normalizamos a 'HH:mm'.
function normalizeTime(value: string): string {
  return value.slice(0, 5)
}

function mapRange(row: Record<string, unknown>): AvailabilityRange {
  return {
    id: String(row.id),
    professional_profile_id: String(row.professional_profile_id),
    day_of_week: Number(row.day_of_week),
    start_time: normalizeTime(String(row.start_time)),
    end_time: normalizeTime(String(row.end_time)),
  }
}

export async function getMyAvailability(profileId: string): Promise<AvailabilityRange[]> {
  const professionalProfileId = await getProfessionalProfileId(profileId)
  if (!professionalProfileId) {
    throw new Error('No se encontró tu perfil de profesional')
  }

  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('professional_profile_id', professionalProfileId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(mapRange)
}

export async function saveMyAvailability(
  profileId: string,
  ranges: AvailabilityRangeInput[]
): Promise<void> {
  const professionalProfileId = await getProfessionalProfileId(profileId)
  if (!professionalProfileId) {
    throw new Error('No se encontró tu perfil de profesional')
  }

  for (const range of ranges) {
    if (range.start_time >= range.end_time) {
      throw new Error('La hora de inicio debe ser menor que la hora de fin en todos los rangos')
    }
  }

  // Estrategia simple y segura: borrar todo y re-insertar.
  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('professional_profile_id', professionalProfileId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (ranges.length === 0) {
    return
  }

  const { error: insertError } = await supabase.from('availability').insert(
    ranges.map((range) => ({
      professional_profile_id: professionalProfileId,
      day_of_week: range.day_of_week,
      start_time: range.start_time,
      end_time: range.end_time,
    }))
  )

  if (insertError) {
    throw new Error(insertError.message)
  }
}

export async function getAvailabilityForProfessional(
  professionalProfileId: string
): Promise<AvailabilityRange[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('professional_profile_id', professionalProfileId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(mapRange)
}

export type ExistingAppointmentSlot = {
  scheduled_at: string
  duration_minutes: number
  status: string
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function toHHmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Calcula las horas de inicio disponibles ('HH:mm') para una fecha dada.
 * Genera slots cada `durationMinutes` dentro de los rangos del día de semana
 * correspondiente, excluye los que traslapen con citas 'pending'/'confirmed'
 * y, si la fecha es hoy, excluye horas pasadas (zona horaria local del usuario).
 */
export function computeAvailableSlots(
  availabilityRanges: AvailabilityRange[],
  existingAppointments: ExistingAppointmentSlot[],
  date: Date,
  durationMinutes = 50
): string[] {
  const dayOfWeek = date.getDay()
  const ranges = availabilityRanges
    .filter((range) => range.day_of_week === dayOfWeek)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  if (ranges.length === 0) {
    return []
  }

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const busy = existingAppointments
    .filter((appt) => appt.status === 'pending' || appt.status === 'confirmed')
    .map((appt) => {
      const start = new Date(appt.scheduled_at)
      const end = new Date(start.getTime() + appt.duration_minutes * 60 * 1000)
      return { start, end }
    })

  const slots: string[] = []

  for (const range of ranges) {
    const rangeStart = toMinutes(range.start_time)
    const rangeEnd = toMinutes(range.end_time)

    for (let start = rangeStart; start + durationMinutes <= rangeEnd; start += durationMinutes) {
      const time = toHHmm(start)
      const [hours, minutes] = time.split(':').map(Number)
      const slotStart = new Date(date)
      slotStart.setHours(hours, minutes, 0, 0)
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)

      if (isToday && slotStart <= now) {
        continue
      }

      const overlaps = busy.some((appt) => slotStart < appt.end && appt.start < slotEnd)
      if (overlaps) {
        continue
      }

      slots.push(time)
    }
  }

  return slots
}
