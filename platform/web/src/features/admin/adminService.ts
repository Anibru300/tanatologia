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

export async function updateProfessionalVerification(id: string, status: string, isVisible: boolean) {
  const { error } = await supabase
    .from('professional_profiles')
    .update({ verification_status: status, is_visible: isVisible })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
