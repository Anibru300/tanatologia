import { supabase } from '@/lib/supabase'

export type ProfessionalReviewPublic = {
  id: string
  professional_profile_id: string
  rating: number
  comment: string | null
  created_at: string
}

/** Reseñas públicas (anónimas) de un profesional para el directorio. */
export async function getProfessionalReviewsPublic(professionalProfileId: string): Promise<ProfessionalReviewPublic[]> {
  const { data, error } = await supabase
    .from('professional_reviews_public')
    .select('id, professional_profile_id, rating, comment, created_at')
    .eq('professional_profile_id', professionalProfileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    professional_profile_id: String(r.professional_profile_id),
    rating: Number(r.rating),
    comment: r.comment ? String(r.comment) : null,
    created_at: String(r.created_at),
  }))
}

/** IDs de citas que el paciente ya reseñó (para no ofrecer de nuevo). */
export async function getRatedAppointmentIdsForPatient(patientProfileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('professional_reviews')
    .select('appointment_id')
    .eq('patient_profile_id', patientProfileId)

  if (error) throw new Error(error.message)
  return (data || []).map((r: { appointment_id: string }) => String(r.appointment_id))
}

/** IDs de citas que el profesional ya calificó. */
export async function getRatedAppointmentIdsForProfessional(professionalProfileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('patient_reviews')
    .select('appointment_id')
    .eq('professional_profile_id', professionalProfileId)

  if (error) throw new Error(error.message)
  return (data || []).map((r: { appointment_id: string }) => String(r.appointment_id))
}

export async function submitProfessionalReview(input: {
  professional_profile_id: string
  patient_profile_id: string
  appointment_id: string
  rating: number
  comment: string | null
}): Promise<void> {
  const { error } = await supabase.from('professional_reviews').insert({
    professional_profile_id: input.professional_profile_id,
    patient_profile_id: input.patient_profile_id,
    appointment_id: input.appointment_id,
    rating: input.rating,
    comment: input.comment,
  })
  if (error) throw new Error(error.message)
}

export async function submitPatientReview(input: {
  patient_profile_id: string
  professional_profile_id: string
  appointment_id: string
  rating: number
  comment: string | null
}): Promise<void> {
  const { error } = await supabase.from('patient_reviews').insert({
    patient_profile_id: input.patient_profile_id,
    professional_profile_id: input.professional_profile_id,
    appointment_id: input.appointment_id,
    rating: input.rating,
    comment: input.comment,
  })
  if (error) throw new Error(error.message)
}

/** Rating agregado por paciente (visible para profesionales con cita con él). */
export async function getPatientRatingsForProfessional(professionalProfileId: string): Promise<
  { patient_profile_id: string; rating: number; rating_count: number }[]
> {
  const { data, error } = await supabase
    .from('patient_reviews')
    .select('patient_profile_id, rating')
    .eq('professional_profile_id', professionalProfileId)

  if (error) throw new Error(error.message)

  const byPatient = new Map<string, number[]>()
  for (const row of data || []) {
    const list = byPatient.get(row.patient_profile_id) || []
    list.push(Number(row.rating))
    byPatient.set(row.patient_profile_id, list)
  }
  return [...byPatient.entries()].map(([patient_profile_id, ratings]) => ({
    patient_profile_id,
    rating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
    rating_count: ratings.length,
  }))
}
