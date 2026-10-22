import { supabase } from '@/lib/supabase'

export type AdminProfessional = {
  id: string
  profile_id: string
  full_name: string
  email: string
  specialties: string[]
  verification_status: string
  is_visible: boolean
  license_number?: string
}

/** Detalle completo de un profesional para revisión del admin (solo lectura).
 *  Une `professional_profiles` con los datos de contacto de `profiles`. */
export type AdminProfessionalDetail = {
  id: string
  profile_id: string
  full_name: string
  professional_title?: string
  license_number?: string
  university?: string
  specialties: string[]
  approach?: string
  bio?: string
  education?: string
  languages?: string[]
  years_experience?: number | null
  session_price: number | null
  verification_status: string
  is_visible: boolean
  rating: number
  rejection_reason?: string
  email: string
  phone?: string
  avatar_url?: string
  timezone?: string
}

export async function getProfessionalDetail(professionalProfileId: string): Promise<AdminProfessionalDetail> {
  const { data, error } = await supabase
    .from('professional_profiles')
    .select(
      `id, profile_id, full_name, professional_title, license_number, university,
       specialties, approach, bio, education, languages, years_experience, session_price,
       verification_status, is_visible, rating, rejection_reason,
       profiles!professional_profiles_profile_id_fkey(email, phone, avatar_url, timezone)`
    )
    .eq('id', professionalProfileId)
    .single()

  if (error) throw new Error(error.message)

  const row = data as Record<string, unknown>
  const prof = (row.profiles as Record<string, unknown>) || {}
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    full_name: String(row.full_name || ''),
    professional_title: row.professional_title ? String(row.professional_title) : undefined,
    license_number: row.license_number ? String(row.license_number) : undefined,
    university: row.university ? String(row.university) : undefined,
    specialties: (row.specialties as string[]) || [],
    approach: row.approach ? String(row.approach) : undefined,
    bio: row.bio ? String(row.bio) : undefined,
    education: row.education ? String(row.education) : undefined,
    languages: (row.languages as string[]) || undefined,
    years_experience: row.years_experience != null ? Number(row.years_experience) : null,
    session_price: row.session_price != null ? Number(row.session_price) : null,
    verification_status: String(row.verification_status || 'pending'),
    is_visible: Boolean(row.is_visible),
    rating: Number(row.rating ?? 0),
    rejection_reason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    email: String(prof.email || ''),
    phone: prof.phone ? String(prof.phone) : undefined,
    avatar_url: prof.avatar_url ? String(prof.avatar_url) : undefined,
    timezone: prof.timezone ? String(prof.timezone) : undefined,
  }
}

export type AdminPatient = {
  id: string
  profile_id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
}

export type AdminAppointment = {
  id: string
  patient_name: string
  professional_name: string
  scheduled_at: string
  status: string
  session_type: string
}

export type AdminQuote = {
  id: string
  name: string
  email: string
  phone?: string
  service_type: string
  total_amount?: number
  created_at: string
}

export async function getAdminProfessionals(): Promise<AdminProfessional[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, professional_profiles!professional_profiles_profile_id_fkey(id, specialties, verification_status, is_visible, license_number)')
    .eq('role', 'professional')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: Record<string, unknown>) => {
    const rawPp = row.professional_profiles
    const pp = (Array.isArray(rawPp) ? rawPp[0] : rawPp) as Record<string, unknown> || {}
    return {
      profile_id: String(row.id),
      id: String(pp.id || row.id),
      full_name: String(row.full_name),
      email: String(row.email),
      specialties: (pp.specialties as string[]) || [],
      verification_status: String(pp.verification_status || 'pending'),
      is_visible: Boolean(pp.is_visible),
      license_number: pp.license_number ? String(pp.license_number) : undefined,
    }
  })
}

export async function getAdminPatients(): Promise<AdminPatient[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, created_at')
    .eq('role', 'patient')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: Record<string, unknown>) => ({
    profile_id: String(row.id),
    id: String(row.id),
    full_name: String(row.full_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    created_at: String(row.created_at),
  }))
}

export async function getAdminAppointments(): Promise<AdminAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, scheduled_at, status, session_type, patient_profiles(full_name), professional_profiles(full_name)'
    )
    .order('scheduled_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: Record<string, unknown>) => {
    const pp = (row.patient_profiles as { full_name?: string } | null) || {}
    const prof = (row.professional_profiles as { full_name?: string } | null) || {}
    return {
      id: String(row.id),
      patient_name: pp.full_name || 'Paciente',
      professional_name: prof.full_name || 'Profesional',
      scheduled_at: String(row.scheduled_at),
      status: String(row.status),
      session_type: String(row.session_type),
    }
  })
}

export type AdminSlot = {
  id: string
  professional_profile_id: string
  slot_start: string
  slot_end: string
  booked: boolean
}

/**
 * Slots futuros de TODOS los profesionales (RLS admin = acceso total).
 * `booked` indica si el slot traslapa una cita pending/confirmed (misma
 * lógica de solapamiento que get_booked_slots del booking).
 */
export async function getAdminSlots(): Promise<AdminSlot[]> {
  const now = new Date()

  const [{ data: slotsData, error }, { data: apptsData, error: apptsError }] = await Promise.all([
    supabase
      .from('availability_slots')
      .select('id, professional_profile_id, slot_start, slot_end')
      .gte('slot_start', now.toISOString())
      .order('slot_start', { ascending: true }),
    supabase
      .from('appointments')
      .select('professional_profile_id, scheduled_at, duration_minutes')
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', now.toISOString()),
  ])

  if (error) throw new Error(error.message)
  if (apptsError) throw new Error(apptsError.message)

  const busyByProfessional = new Map<string, { start: Date; end: Date }[]>()
  for (const row of (apptsData || []) as Record<string, unknown>[]) {
    const profId = String(row.professional_profile_id)
    const start = new Date(String(row.scheduled_at))
    const end = new Date(start.getTime() + Number(row.duration_minutes ?? 50) * 60 * 1000)
    const list = busyByProfessional.get(profId) || []
    list.push({ start, end })
    busyByProfessional.set(profId, list)
  }

  return ((slotsData || []) as Record<string, unknown>[]).map((row) => {
    const start = new Date(String(row.slot_start))
    const end = new Date(String(row.slot_end))
    const busy = busyByProfessional.get(String(row.professional_profile_id)) || []
    return {
      id: String(row.id),
      professional_profile_id: String(row.professional_profile_id),
      slot_start: String(row.slot_start),
      slot_end: String(row.slot_end),
      booked: busy.some((appt) => start < appt.end && appt.start < end),
    }
  })
}

export async function getAdminQuotes(): Promise<AdminQuote[]> {
  const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    service_type: String(row.service_type),
    total_amount: row.total_amount ? Number(row.total_amount) : undefined,
    created_at: String(row.created_at),
  }))
}

export type AdminCallFact = {
  participants: number
  duration_minutes: number | null
  room_destroyed: boolean
}

/**
 * Hechos reales de la videollamada de cada cita (tabla video_call_events,
 * poblada por el webhook de JaaS, migración 032). Devuelve participantes
 * distintos que entraron, duración real (primer ingreso → último evento) y
 * si la sala llegó a cerrarse.
 */
export async function getCallFacts(appointmentIds: string[]): Promise<Map<string, AdminCallFact>> {
  const map = new Map<string, AdminCallFact>()
  if (appointmentIds.length === 0) return map

  const { data, error } = await supabase
    .from('video_call_events')
    .select('appointment_id, event_type, participant_jid, occurred_at')
    .in('appointment_id', appointmentIds)
    .order('occurred_at', { ascending: true })

  if (error) throw new Error(error.message)

  const grouped = new Map<string, { joined: Set<string>; first: string | null; last: string | null; destroyed: boolean }>()
  for (const row of (data || []) as Record<string, unknown>[]) {
    const id = String(row.appointment_id)
    const g = grouped.get(id) || { joined: new Set<string>(), first: null, last: null, destroyed: false }
    const at = String(row.occurred_at)
    if (row.event_type === 'PARTICIPANT_JOINED' && row.participant_jid) {
      g.joined.add(String(row.participant_jid))
      if (!g.first || at < g.first) g.first = at
    }
    if (!g.last || at > g.last) g.last = at
    if (row.event_type === 'ROOM_DESTROYED') g.destroyed = true
    grouped.set(id, g)
  }

  for (const [id, g] of grouped) {
    const duration =
      g.first && g.last ? Math.max(0, Math.round((new Date(g.last).getTime() - new Date(g.first).getTime()) / 60000)) : null
    map.set(id, { participants: g.joined.size, duration_minutes: duration, room_destroyed: g.destroyed })
  }
  return map
}

export async function updateProfessionalVerification(id: string, status: string, isVisible: boolean) {
  const { error } = await supabase
    .from('professional_profiles')
    .update({ verification_status: status, is_visible: isVisible })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
