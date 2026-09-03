import { useCallback, useEffect, useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { FeedbackForm } from '@/features/feedback/FeedbackForm'
import { FeedbackList } from '@/features/feedback/FeedbackList'
import { listMyFeedback } from '@/features/feedback/feedbackService'
import type { Feedback } from '@/features/feedback/types'

export function ProfessionalFeedback() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listMyFeedback()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus comentarios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Tu opinión mejora Somos Calma</h1>
          <p className="text-text-light">
            Como profesional de la salud mental, tu perspectiva nos ayuda a construir una mejor plataforma.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Envía tu comentario</CardTitle>
              <CardDescription>Toma menos de dos minutos y nos ayuda muchísimo.</CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackForm onSubmitted={load} />
            </CardContent>
          </Card>

          <section aria-labelledby="my-feedback-title">
            <h2 id="my-feedback-title" className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
              <MessageSquarePlus size={20} className="text-primary-dark" aria-hidden />
              Mis comentarios enviados
            </h2>
            <FeedbackList items={items} loading={loading} error={error} onReload={load} />
          </section>
        </div>
      </div>
    </div>
  )
}
