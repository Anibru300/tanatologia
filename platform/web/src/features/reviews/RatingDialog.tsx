import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Alert } from '@/components/ui/Alert'
import { StarRating } from './StarRating'

export function RatingDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  onSubmit: (rating: number, comment: string | null) => Promise<void>
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    if (saving) return
    setRating(0)
    setComment('')
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Elige una calificación de 1 a 5 estrellas.')
      return
    }
    try {
      setSaving(true)
      setError('')
      const trimmed = comment.trim()
      await onSubmit(rating, trimmed.length > 0 ? trimmed.slice(0, 1000) : null)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la calificación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} className="max-w-md">
      <div className="space-y-4">
        <p className="text-text-light text-sm">{description}</p>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex justify-center py-2">
          <StarRating value={rating} onChange={setRating} size={36} />
        </div>
        <Textarea
          label="Comentario (opcional)"
          rows={3}
          placeholder="Cuéntanos cómo fue tu experiencia (máx. 1000 caracteres)."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || rating < 1}>
            {saving ? 'Guardando...' : 'Enviar calificación'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
