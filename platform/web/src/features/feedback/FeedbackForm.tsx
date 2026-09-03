import { useState } from 'react'
import { Star } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { submitFeedback } from './feedbackService'
import { FEEDBACK_TYPE_LABELS, type FeedbackType } from './types'

const MIN_COMMENT_LENGTH = 10
const MAX_COMMENT_LENGTH = 2000

const TYPE_OPTIONS = (Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]).map((value) => ({
  value,
  label: FEEDBACK_TYPE_LABELS[value],
}))

interface FeedbackFormProps {
  /** Se llama después de un envío exitoso para recargar la lista. */
  onSubmitted: () => void
}

/** Formulario compartido para que pacientes y profesionales envíen feedback. */
export function FeedbackForm({ onSubmitted }: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackType>('general')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const trimmedComment = comment.trim()
  const commentTooShort = trimmedComment.length > 0 && trimmedComment.length < MIN_COMMENT_LENGTH
  const isValid = rating >= 1 && trimmedComment.length >= MIN_COMMENT_LENGTH

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await submitFeedback({ type, rating, comment })
      setSuccess('¡Gracias! Tu comentario nos ayuda a mejorar Somos Calma.')
      setType('general')
      setRating(0)
      setComment('')
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu comentario. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <Alert variant="success" className="mb-2" onDismiss={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && <Alert variant="error" className="mb-2">{error}</Alert>}

      <Select
        label="¿Qué quieres compartirnos?"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(e) => setType(e.target.value as FeedbackType)}
      />

      <div>
        <p className="block text-sm font-medium text-text mb-1.5" id="feedback-rating-label">
          ¿Cómo ha sido tu experiencia?
        </p>
        <div className="flex items-center gap-1" role="radiogroup" aria-labelledby="feedback-rating-label">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} de 5 estrellas`}
              onClick={() => setRating(value)}
              className="p-1 rounded-sm text-primary hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/60"
            >
              <Star
                size={28}
                className={value <= rating ? 'fill-primary' : 'text-muted'}
                aria-hidden
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-text-light" aria-live="polite">
              {rating}/5
            </span>
          )}
        </div>
      </div>

      <div>
        <Textarea
          label="Cuéntanos más"
          rows={5}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Comparte tu experiencia, una idea o algo que no esté funcionando bien..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          aria-describedby="feedback-comment-count"
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-text-light">
            Mínimo {MIN_COMMENT_LENGTH} caracteres.
          </p>
          <p
            id="feedback-comment-count"
            className={`text-xs ${commentTooShort ? 'text-error-dark' : 'text-text-light'}`}
          >
            {trimmedComment.length}/{MAX_COMMENT_LENGTH}
          </p>
        </div>
      </div>

      <Button type="submit" disabled={!isValid || submitting}>
        {submitting ? 'Enviando...' : 'Enviar comentario'}
      </Button>
    </form>
  )
}
