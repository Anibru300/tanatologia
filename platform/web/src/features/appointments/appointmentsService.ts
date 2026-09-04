import { supabase } from '@/lib/supabase'

export type SessionType = 'single' | 'program_4' | 'program_6'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type ProfessionalProfile = {
  id: string
  profile_id: string
  full_name: string
  specialties: string[]
  session_price: number
  program_4_price: number
  program_6_price: number
  verification_status: string
  is_visible: boolean
  rating: number
  rating_count: number
  bio?: string
  education?: string
  university?: string
  professional_title?: string
  languages?: string[]
  years_experience?: number | null
  approach?: string
}

export type Appointment = {
  id: string
  patient_profile_id: string
  professional_profile_id: string
  patientName: string
  professionalName: string
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  session_type: SessionType
  serviceName: string
  video_link: string | null
  notes: string | null
  created_at: string
}

export async function getProfessionalProfiles(): Promise<ProfessionalProfile[]> {
  const { data, error } = await supabase
    .from('professional_profiles')
    .select(
      'id, profile_id, full_name, specialties, session_price, program_4_price, program_6_price, verification_status, is_visible, rating, rating_count, bio, education, university, professional_title, languages, years_experience, approach'
    )
    .eq('verification_status', 'verified')
    .eq('is_visible', true)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row: Record<string, unknown>) => {
    return {
      id: String(row.id),
      profile_id: String(row.profile_id),
      full_name: row.full_name ? String(row.full_name) : 'Profesional',
      specialties: (row.specialties as string[]) || [],
      session_price: Number(row.session_price),
      program_4_price: Number(row.program_4_price),
      program_6_price: Number(row.program_6_price),
      verification_status: String(row.verification_status),
      is_visible: Boolean(row.is_visible),
      rating: Number(row.rating),
      rating_count: Number(row.rating_count || 0),
      bio: row.bio ? String(row.bio) : undefined,
      education: row.education ? String(row.education) : undefined,
      university: row.university ? String(row.university) : undefined,
      professional_title: row.professional_title ? String(row.professional_title) : undefined,
      languages: (row.languages as string[]) || [],
      years_experience: row.years_experience !== null && row.years_experience !== undefined ? Number(row.years_experience) : null,
      approach: row.approach ? String(row.approach) : undefined,
    }
  })
}

export async function getPatientProfileId(profileId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (error || !data) {
    return null
  }

  return String(data.id)
}

export async function getProfessionalProfileId(profileId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (error || !data) {
    return null
  }

  return String(data.id)
}

export async function createAppointment(params: {
  patient_profile_id: string
  professional_profile_id: string
  scheduled_at: string
  duration_minutes: number
  session_type: SessionType
  serviceName: string
}) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_profile_id: params.patient_profile_id,
      professional_profile_id: params.professional_profile_id,
      scheduled_at: params.scheduled_at,
      duration_minutes: params.duration_minutes,
      session_type: params.session_type,
      notes: params.serviceName,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('No se pudo crear la cita')
  }

  // El trigger set_appointment_video_link genera el enlace automáticamente.
  return {
    ...data,
    video_link: data.video_link || null,
  } as Appointment
}

export async function updateAppointmentVideoLink(id: string, videoLink: string): Promise<void> {
  const { error } = await supabase.from('appointments').update({ video_link: videoLink }).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  const patientProfiles = row.patient_profiles as { full_name: string } | null
  const professionalProfiles = row.professional_profiles as { full_name: string } | null

  return {
    id: String(row.id),
    patient_profile_id: String(row.patient_profile_id),
    professional_profile_id: String(row.professional_profile_id),
    patientName: patientProfiles?.full_name || 'Paciente',
    professionalName: professionalProfiles?.full_name || 'Profesional',
    scheduled_at: String(row.scheduled_at),
    duration_minutes: Number(row.duration_minutes),
    status: row.status as AppointmentStatus,
    session_type: row.session_type as SessionType,
    serviceName: row.notes ? String(row.notes) : '',
    video_link: row.video_link ? String(row.video_link) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
  }
}

export async function getAppointmentsForPatient(patientProfileId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient_profiles(full_name), professional_profiles(full_name)')
    .eq('patient_profile_id', patientProfileId)
    .order('scheduled_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(mapAppointment)
}

export async function getAppointmentsForProfessional(professionalProfileId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient_profiles(full_name), professional_profiles(full_name)')
    .eq('professional_profile_id', professionalProfileId)
    .order('scheduled_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(mapAppointment)
}

export type AppointmentTimeSlot = {
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
}

/**
 * Devuelve los horarios ocupados de un profesional para una fecha ('YYYY-MM-DD').
 * Usa la RPC get_booked_slots (SECURITY DEFINER) porque el RLS solo permite
 * leer las citas propias; la RPC expone solo horarios, sin datos del paciente.
 */
export async function getProfessionalAppointmentsForDate(
  professionalProfileId: string,
  date: string
): Promise<AppointmentTimeSlot[]> {
  const [year, month, day] = date.split('-').map(Number)
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0)
  const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0)

  const { data, error } = await supabase.rpc('get_booked_slots', {
    p_professional_profile_id: professionalProfileId,
    p_start: dayStart.toISOString(),
    p_end: dayEnd.toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    scheduled_at: String(row.scheduled_at),
    duration_minutes: Number(row.duration_minutes),
    status: row.status as AppointmentStatus,
  }))
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient_profiles(full_name), professional_profiles(full_name)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return mapAppointment(data as Record<string, unknown>)
}
