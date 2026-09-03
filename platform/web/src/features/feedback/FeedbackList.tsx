import { useState } from 'react'
import { Star, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { deleteFeedback } from './feedbackService'
import {
  FEEDBACK_STATUS_BADGE_VARIANTS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  type Feedback,
} from './types'

interface FeedbackListProps {
  items: Feedback[]
  loading: boolean
  error: string
  /** Se llama tras eliminar (o al reintentar tras un error) para recargar. */
  onReload: () => void
}

/** Lista compartida del feedback enviado por el usuario autenticado. */
export function FeedbackList({ items, loading, error, onReload }: FeedbackListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (loading) return <SkeletonCards count={2} />

  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={onReload}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Aún no has enviado comentarios"
        description="Cuando envíes tu primer comentario aparecerá aquí."
      />
    )
  }

  async function handleDelete() {
    if (!deletingId || deleting) return

    setDeleting(true)
    setDeleteError('')
    try {
      await deleteFeedback(deletingId)
      setDeletingId(null)
      onReload()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el comentario.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {items.map((item) => (
        <div key={item.id} className="p-4 rounded-sm border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-light">
                {new Date(item.created_at).toLocaleDateString('es-MX')}
              </span>
              <Badge variant="info">{FEEDBACK_TYPE_LABELS[item.type]}</Badge>
              <Badge variant={FEEDBACK_STATUS_BADGE_VARIANTS[item.status]}>
                {FEEDBACK_STATUS_LABELS[item.status]}
              </Badge>
            </div>
            {item.status === 'new' && (
              <Button
                variant="danger-outline"
                size="sm"
                onClick={() => setDeletingId(item.id)}
                aria-label="Eliminar comentario"
              >
                <Trash2 size={16} />
                Eliminar
              </Button>
            )}
          </div>

          <div
            className="flex items-center gap-0.5 mb-2"
            aria-label={`Calificación: ${item.rating} de 5`}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                size={16}
                className={value <= item.rating ? 'fill-primary text-primary' : 'text-muted'}
                aria-hidden
              />
            ))}
          </div>

          <p className="text-text whitespace-pre-wrap">{item.comment}</p>
        </div>
      ))}

      <ConfirmDialog
        open={deletingId !== null}
        title="Eliminar comentario"
        destructive
        loading={deleting}
        message="Este comentario se eliminará de forma permanente. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
