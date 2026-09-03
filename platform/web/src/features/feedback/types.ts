export type FeedbackType = 'general' | 'suggestion' | 'issue' | 'praise'

export type FeedbackStatus = 'new' | 'in_review' | 'resolved' | 'dismissed'

export type Feedback = {
  id: string
  profile_id: string
  role: 'patient' | 'professional'
  type: FeedbackType
  rating: number
  comment: string
  status: FeedbackStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export type FeedbackFilters = {
  role?: 'patient' | 'professional'
  type?: FeedbackType
  status?: FeedbackStatus
  dateFrom?: string
  dateTo?: string
}

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  general: 'General',
  suggestion: 'Sugerencia',
  issue: 'Reporte de problema',
  praise: 'Felicitación',
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Nuevo',
  in_review: 'En revisión',
  resolved: 'Resuelto',
  dismissed: 'Descartado',
}

export const FEEDBACK_ROLE_LABELS: Record<'patient' | 'professional', string> = {
  patient: 'Paciente',
  professional: 'Profesional',
}

/** Variante de Badge según el estado del feedback. */
export const FEEDBACK_STATUS_BADGE_VARIANTS: Record<FeedbackStatus, 'default' | 'warning' | 'success' | 'error'> = {
  new: 'default',
  in_review: 'warning',
  resolved: 'success',
  dismissed: 'error',
}
