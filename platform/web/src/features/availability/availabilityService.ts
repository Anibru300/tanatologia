import { supabase } from '@/lib/supabase'
import { getProfessionalProfileId } from '@/features/appointments/appointmentsService'

export const SLOT_DURATION_MINUTES = 50

export type AvailabilitySlot = {
  id: string
  professional_profile_id: string
  slot_start: string // ISO timestamptz
  slot_end: string // ISO timestamptz
}

function mapSlot(row: Record<string, unknown>): AvailabilitySlot {
  return {
    id: String(row.id),
    professional_profile_id: String(row.professional_profile_id),
    slot_start: String(row.slot_start),
    slot_end: String(row.slot_end),
  }
}

/** Mensaje amigable cuando la constraint EXCLUDE detecta traslape. */
function friendlyError(error: { message: string }): Error {
  if (error.message.includes('availability_slots_no_overlap')) {
    return new Error('Ese horario se traslapa con otro que ya tienes registrado.')
  }
  return new Error(error.message)
}

/** Slots futuros del profesional autenticado (recibe profiles.id del usuario). */
export async function getMyAvailability(profileId: string): Promise<AvailabilitySlot[]> {
  const professionalProfileId = await getProfessionalProfileId(profileId)
  if (!professionalProfileId) {
    throw new Error('No se encontró tu perfil de profesional')
  }

  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('professional_profile_id', professionalProfileId)
    .gte('slot_start', new Date().toISOString())
    .order('slot_start', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(mapSlot)
}

/**
 * Crea un slot de SLOT_DURATION_MINUTES que inicia en `start` (Date local).
 * Devuelve el slot creado. La BD rechaza traslapes (constraint EXCLUDE).
 */
export async function addSlot(profileId: string, start: Date): Promise<AvailabilitySlot> {
  const professionalProfileId = await getProfessionalProfileId(profileId)
  if (!professionalProfileId) {
    throw new Error('No se encontró tu perfil de profesional')
  }

  const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)

  const { data, error } = await supabase
    .from('availability_slots')
    .insert({
      professional_profile_id: professionalProfileId,
      slot_start: start.toISOString(),
      slot_end: end.toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw friendlyError(error)
  }

  return mapSlot(data as Record<string, unknown>)
}

/** Elimina un slot por id (RLS garantiza que solo el dueño pueda). */
export async function deleteSlot(slotId: string): Promise<void> {
  const { error } = await supabase.from('availability_slots').delete().eq('id', slotId)
  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Slots LIBRES de un profesional en un rango de fechas (para el booking):
 * slots futuros que no traslapen con citas 'pending'/'confirmed'.
 */
export async function getAvailableSlotsForProfessional(
  professionalProfileId: string,
  from: Date,
  to: Date
): Promise<AvailabilitySlot[]> {
  const now = new Date()
  const effectiveFrom = from > now ? from : now

  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('professional_profile_id', professionalProfileId)
    .gte('slot_start', effectiveFrom.toISOString())
    .lt('slot_start', to.toISOString())
    .order('slot_start', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const slots = (data || []).map(mapSlot)
  if (slots.length === 0) {
    return []
  }

  // Horarios ocupados en el mismo rango (RPC SECURITY DEFINER: expone solo horarios).
  const { data: booked, error: bookedError } = await supabase.rpc('get_booked_slots', {
    p_professional_profile_id: professionalProfileId,
    p_start: effectiveFrom.toISOString(),
    p_end: to.toISOString(),
  })

  if (bookedError) {
    throw new Error(bookedError.message)
  }

  const busy: { start: Date; end: Date }[] = ((booked || []) as Record<string, unknown>[]).map((row) => {
    const start = new Date(String(row.scheduled_at))
    const end = new Date(start.getTime() + Number(row.duration_minutes) * 60 * 1000)
    return { start, end }
  })

  return slots.filter((slot) => {
    const start = new Date(slot.slot_start)
    const end = new Date(slot.slot_end)
    return !busy.some((appt) => start < appt.end && appt.start < end)
  })
}
