import type { FeedbackFilters } from './types'

export type FeedbackQueryCondition = {
  column: 'role' | 'type' | 'status' | 'created_at'
  op: 'eq' | 'gte' | 'lte'
  value: string
}

export type FeedbackQuerySpec = {
  filters: FeedbackQueryCondition[]
  order: { column: 'created_at'; ascending: boolean }
  limit: number
}

/** Construye la especificación de consulta (condiciones + orden) para el
 *  listado de feedback del admin. Función pura y fácil de probar. */
export function buildFeedbackQuery(filters: FeedbackFilters): FeedbackQuerySpec {
  const conditions: FeedbackQueryCondition[] = []

  if (filters.role) {
    conditions.push({ column: 'role', op: 'eq', value: filters.role })
  }
  if (filters.type) {
    conditions.push({ column: 'type', op: 'eq', value: filters.type })
  }
  if (filters.status) {
    conditions.push({ column: 'status', op: 'eq', value: filters.status })
  }
  if (filters.dateFrom) {
    conditions.push({ column: 'created_at', op: 'gte', value: filters.dateFrom })
  }
  if (filters.dateTo) {
    conditions.push({ column: 'created_at', op: 'lte', value: filters.dateTo })
  }

  return {
    filters: conditions,
    order: { column: 'created_at', ascending: false },
    limit: 500,
  }
}
