export type TutorialStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'unpublished'
  | 'rejected'

export type TutorialAudience = 'patient' | 'professional' | 'both'

export interface Tutorial {
  id: string
  title: string
  description: string
  audience: TutorialAudience
  category: string
  status: TutorialStatus
  video_path: string | null
  thumbnail_path: string | null
  duration_seconds: number | null
  sort_order: number
  created_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface TutorialFormData {
  title: string
  description: string
  audience: TutorialAudience
  category: string
  status: TutorialStatus
  sort_order: number
}

export const STATUS_LABELS: Record<TutorialStatus, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  published: 'Publicado',
  unpublished: 'Desactivado',
  rejected: 'No publicar',
}

export const AUDIENCE_LABELS: Record<TutorialAudience, string> = {
  patient: 'Pacientes',
  professional: 'Profesionistas',
  both: 'Ambos',
}
