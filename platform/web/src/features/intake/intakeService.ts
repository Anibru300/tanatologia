import { supabase } from '@/lib/supabase'

export type IntakeRecord = {
  needType: string | null
  topics: string[]
  therapistGender: string | null
  preferredTime: string | null
  firstTherapy: string | null
  reasonText: string
  screeningDone: boolean
  phq9: number[]
  gad7: number[]
}

/** Devuelve true si el paciente ya completó la encuesta de registro. */
export async function hasCompletedIntake(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('intake_completed_at')
    .eq('profile_id', userId)
    .single()

  if (error || !data) return false
  return Boolean(data.intake_completed_at)
}

export async function getMyIntake(userId: string): Promise<IntakeRecord | null> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('intake, intake_completed_at')
    .eq('profile_id', userId)
    .single()

  if (error || !data?.intake) return null
  return data.intake as IntakeRecord
}

export async function saveIntake(userId: string, intake: IntakeRecord, reasonText: string): Promise<void> {
  const { error } = await supabase
    .from('patient_profiles')
    .update({
      intake,
      intake_completed_at: new Date().toISOString(),
      ...(reasonText.trim() ? { reason_for_visit: reasonText.trim().slice(0, 500) } : {}),
    })
    .eq('profile_id', userId)

  if (error) throw new Error(error.message)
}
