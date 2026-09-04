import { supabase } from '@/lib/supabase'

export type VerificationStatus = 'pending' | 'in_review' | 'verified' | 'rejected'

export type MyProfile = {
  id: string
  email: string
  full_name: string
  role: 'patient' | 'professional' | 'admin'
  phone: string | null
  avatar_url: string | null
}

export type PatientProfileData = {
  id: string
  profile_id: string
  full_name: string
  birth_date: string | null
  gender: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  reason_for_visit: string | null
}

export type ProfessionalProfileData = {
  id: string
  profile_id: string
  full_name: string
  professional_title: string | null
  license_number: string | null
  university: string | null
  specialties: string[]
  approach: string | null
  bio: string | null
  languages: string[]
  years_experience: number | null
  education: string | null
  session_price: number | null // centavos
  program_4_price: number | null // centavos
  program_6_price: number | null // centavos
  verification_status: VerificationStatus
}

export type MyProfileResult = {
  profile: MyProfile
  patientProfile: PatientProfileData | null
  professionalProfile: ProfessionalProfileData | null
}

export type UpdateProfileInput = {
  full_name: string
  phone: string | null
}

export type UpdatePatientProfileInput = {
  full_name: string
  birth_date: string | null
  gender: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  reason_for_visit: string | null
}

export type UpdateProfessionalProfileInput = {
  full_name: string
  professional_title: string | null
  license_number: string | null
  university: string | null
  specialties: string[]
  approach: string | null
  bio: string | null
  languages: string[]
  years_experience: number | null
  education: string | null
  // RESERVADO fase monetización — opcionales durante la Beta gratuita
  session_price?: number | null // centavos
  program_4_price?: number | null // centavos
  program_6_price?: number | null // centavos
}

function friendlyError(error: { message?: string } | null, fallback: string): Error {
  const msg = error?.message || ''
  if (msg.includes('row-level security')) {
    return new Error('No tienes permiso para modificar este dato.')
  }
  if (msg.includes('duplicate key')) {
    return new Error('Este valor ya está en uso por otra cuenta.')
  }
  return new Error(fallback)
}

export async function getMyProfile(userId: string): Promise<MyProfileResult> {
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, phone, avatar_url')
    .eq('id', userId)
    .single()

  if (profileError || !profileRow) {
    throw new Error('No se pudo cargar tu perfil. Intenta de nuevo más tarde.')
  }

  const profile = profileRow as MyProfile
  let patientProfile: PatientProfileData | null = null
  let professionalProfile: ProfessionalProfileData | null = null

  if (profile.role === 'patient') {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select(
        'id, profile_id, full_name, birth_date, gender, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, reason_for_visit'
      )
      .eq('profile_id', userId)
      .maybeSingle()

    if (error) {
      throw new Error('No se pudo cargar la información de tu perfil de paciente.')
    }
    patientProfile = (data as PatientProfileData | null) ?? null
  }

  if (profile.role === 'professional') {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(
        'id, profile_id, full_name, professional_title, license_number, university, specialties, approach, bio, languages, years_experience, education, session_price, program_4_price, program_6_price, verification_status'
      )
      .eq('profile_id', userId)
      .maybeSingle()

    if (error) {
      throw new Error('No se pudo cargar la información de tu perfil profesional.')
    }
    professionalProfile = (data as ProfessionalProfileData | null) ?? null
  }

  return { profile, patientProfile, professionalProfile }
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: input.full_name, phone: input.phone })
    .eq('id', userId)

  if (error) {
    throw friendlyError(error, 'No se pudo guardar tu información personal.')
  }
}

export async function updatePatientProfile(
  profileId: string,
  input: UpdatePatientProfileInput
): Promise<void> {
  const { error } = await supabase
    .from('patient_profiles')
    .update({
      full_name: input.full_name,
      birth_date: input.birth_date,
      gender: input.gender,
      emergency_contact_name: input.emergency_contact_name,
      emergency_contact_phone: input.emergency_contact_phone,
      emergency_contact_relationship: input.emergency_contact_relationship,
      reason_for_visit: input.reason_for_visit,
    })
    .eq('profile_id', profileId)

  if (error) {
    throw friendlyError(error, 'No se pudo guardar tu información de paciente.')
  }
}

export async function updateProfessionalProfile(
  profileId: string,
  input: UpdateProfessionalProfileInput
): Promise<void> {
  const { error } = await supabase
    .from('professional_profiles')
    .update({
      full_name: input.full_name,
      professional_title: input.professional_title,
      license_number: input.license_number,
      university: input.university,
      specialties: input.specialties,
      approach: input.approach,
      bio: input.bio,
      languages: input.languages,
      years_experience: input.years_experience,
      education: input.education,
      ...(input.session_price !== undefined && { session_price: input.session_price }),
      ...(input.program_4_price !== undefined && { program_4_price: input.program_4_price }),
      ...(input.program_6_price !== undefined && { program_6_price: input.program_6_price }),
    })
    .eq('profile_id', profileId)

  if (error) {
    throw friendlyError(error, 'No se pudo guardar tu información profesional.')
  }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
  })

  if (uploadError) {
    throw friendlyError(uploadError, 'No se pudo subir la foto. Verifica que sea una imagen válida.')
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)

  if (updateError) {
    throw friendlyError(updateError, 'La foto se subió, pero no se pudo actualizar tu perfil.')
  }

  return publicUrl
}
