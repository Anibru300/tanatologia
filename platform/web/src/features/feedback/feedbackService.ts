import { supabase } from '@/lib/supabase'
import { buildFeedbackQuery } from './buildFeedbackQuery'
import type { Feedback, FeedbackFilters, FeedbackStatus, FeedbackType } from './types'

export type SubmitFeedbackInput = {
  type: FeedbackType
  rating: number
  comment: string
}

function friendlyError(error: { message?: string } | null, fallback: string): Error {
  const msg = error?.message || ''
  if (msg.includes('row-level security')) {
    return new Error('No tienes permiso para realizar esta acción.')
  }
  return new Error(fallback)
}

function mapFeedback(row: Record<string, unknown>): Feedback {
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    role: row.role === 'professional' ? 'professional' : 'patient',
    type: String(row.type) as FeedbackType,
    rating: Number(row.rating),
    comment: String(row.comment ?? ''),
    status: String(row.status ?? 'new') as FeedbackStatus,
    admin_notes: row.admin_notes ? String(row.admin_notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

/** Envía feedback a nombre del usuario autenticado. El rol lo asigna un
 *  trigger desde su perfil (el usuario no lo elige). */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Necesitas iniciar sesión para enviar tu comentario.')
  }

  const { error } = await supabase.from('feedback').insert({
    profile_id: user.id,
    type: input.type,
    rating: input.rating,
    comment: input.comment.trim(),
  })

  if (error) {
    throw friendlyError(error, 'No se pudo enviar tu comentario. Intenta de nuevo más tarde.')
  }
}

/** Feedback del usuario autenticado, del más reciente al más antiguo. */
export async function listMyFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('No se pudieron cargar tus comentarios. Intenta de nuevo más tarde.')
  }

  return (data || []).map((row) => mapFeedback(row as Record<string, unknown>))
}

/** Elimina un comentario propio (RLS solo lo permite mientras está nuevo). */
export async function deleteFeedback(id: string): Promise<void> {
  const { error } = await supabase.from('feedback').delete().eq('id', id)

  if (error) {
    throw friendlyError(error, 'No se pudo eliminar el comentario.')
  }
}

/** Listado completo del admin con filtros opcionales. */
export async function listFeedback(filters: FeedbackFilters): Promise<Feedback[]> {
  const spec = buildFeedbackQuery(filters)

  let query = supabase.from('feedback').select('*')
  for (const condition of spec.filters) {
    if (condition.op === 'eq') {
      query = query.eq(condition.column, condition.value)
    } else if (condition.op === 'gte') {
      query = query.gte(condition.column, condition.value)
    } else {
      query = query.lte(condition.column, condition.value)
    }
  }

  const { data, error } = await query
    .order(spec.order.column, { ascending: spec.order.ascending })
    .limit(spec.limit)

  if (error) {
    throw new Error('No se pudo cargar el feedback. Intenta de nuevo más tarde.')
  }

  return (data || []).map((row) => mapFeedback(row as Record<string, unknown>))
}

/** Cambia el estado (y notas opcionales) de un comentario. Solo admin. */
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string | null
): Promise<void> {
  const { error } = await supabase
    .from('feedback')
    .update({
      status,
      ...(adminNotes !== undefined && { admin_notes: adminNotes }),
    })
    .eq('id', id)

  if (error) {
    throw friendlyError(error, 'No se pudo actualizar el estado del comentario.')
  }
}
