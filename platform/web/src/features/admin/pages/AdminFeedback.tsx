import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { listFeedback, updateFeedbackStatus } from '@/features/feedback/feedbackService'
import {
  FEEDBACK_ROLE_LABELS,
  FEEDBACK_STATUS_BADGE_VARIANTS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  type Feedback,
  type FeedbackStatus,
  type FeedbackType,
} from '@/features/feedback/types'

const EMPTY_FILTERS = { role: '', type: '', status: '', dateFrom: '', dateTo: '' }

const ROLE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'patient', label: 'Paciente' },
  { value: 'professional', label: 'Profesional' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  ...(Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]).map((value) => ({
    value,
    label: FEEDBACK_TYPE_LABELS[value],
  })),
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  ...(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((value) => ({
    value,
    label: FEEDBACK_STATUS_LABELS[value],
  })),
]

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

export function AdminFeedback() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [selected, setSelected] = useState<Feedback | null>(null)
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('new')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  async function load(current: typeof EMPTY_FILTERS) {
    setLoading(true)
    setError('')
    try {
      const data = await listFeedback({
        role: (current.role || undefined) as 'patient' | 'professional' | undefined,
        type: (current.type || undefined) as FeedbackType | undefined,
        status: (current.status || undefined) as FeedbackStatus | undefined,
        dateFrom: current.dateFrom || undefined,
        dateTo: current.dateTo ? `${current.dateTo}T23:59:59.999Z` : undefined,
      })
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el feedback.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(applied)
  }, [applied])

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    setApplied(filters)
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
  }

  function openDetail(item: Feedback) {
    setSelected(item)
    setEditStatus(item.status)
    setEditNotes(item.admin_notes ?? '')
    setSaveError('')
    setSaveSuccess('')
  }

  async function handleSave() {
    if (!selected || saving) return

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')
    try {
      await updateFeedbackStatus(selected.id, editStatus, editNotes.trim() || null)
      setSaveSuccess('Cambios guardados correctamente.')
      setSelected({ ...selected, status: editStatus, admin_notes: editNotes.trim() || null })
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? { ...item, status: editStatus, admin_notes: editNotes.trim() || null }
            : item
        )
      )
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Feedback de la Beta</h1>
          <p className="text-text-light">Comentarios y reportes enviados por pacientes y profesionales.</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtra el feedback por rol, tipo, estado o fecha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <Select
                label="Rol"
                options={ROLE_OPTIONS}
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              />
              <Select
                label="Tipo"
                options={TYPE_OPTIONS}
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              />
              <Select
                label="Estado"
                options={STATUS_OPTIONS}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              />
              <Input
                label="Fecha desde"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
              <Input
                label="Fecha hasta"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
              <div className="flex gap-3">
                <Button type="submit" variant="outline" className="flex-1">
                  Filtrar
                </Button>
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Limpiar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comentarios recibidos</CardTitle>
            <CardDescription>{items.length} registros</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              loading={loading}
              rows={items}
              keyOf={(item) => item.id}
              emptyMessage="No hay comentarios que coincidan con los filtros."
              caption="Feedback recibido durante la Beta"
              columns={[
                {
                  header: 'Fecha',
                  render: (item) => (
                    <span className="text-text-light">
                      {new Date(item.created_at).toLocaleDateString('es-MX')}
                    </span>
                  ),
                },
                {
                  header: 'Rol',
                  render: (item) => <Badge variant="info">{FEEDBACK_ROLE_LABELS[item.role]}</Badge>,
                },
                {
                  header: 'Tipo',
                  render: (item) => (
                    <span className="text-text">{FEEDBACK_TYPE_LABELS[item.type]}</span>
                  ),
                },
                {
                  header: 'Calificación',
                  render: (item) => (
                    <span className="flex items-center gap-1 text-text" aria-label={`${item.rating} de 5 estrellas`}>
                      <Star size={14} className="fill-primary text-primary" aria-hidden />
                      {item.rating}/5
                    </span>
                  ),
                },
                {
                  header: 'Comentario',
                  render: (item) => (
                    <span className="text-text-light">{truncate(item.comment)}</span>
                  ),
                },
                {
                  header: 'Estado',
                  render: (item) => (
                    <Badge variant={FEEDBACK_STATUS_BADGE_VARIANTS[item.status]}>
                      {FEEDBACK_STATUS_LABELS[item.status]}
                    </Badge>
                  ),
                },
                {
                  header: 'Acciones',
                  render: (item) => (
                    <Button variant="outline" size="sm" onClick={() => openDetail(item)}>
                      Ver
                    </Button>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Modal open={selected !== null} onClose={() => setSelected(null)} title="Detalle del comentario">
          {selected && (
            <div className="space-y-4">
              {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
              {saveError && <Alert variant="error">{saveError}</Alert>}

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{FEEDBACK_ROLE_LABELS[selected.role]}</Badge>
                <Badge variant="info">{FEEDBACK_TYPE_LABELS[selected.type]}</Badge>
                <Badge variant={FEEDBACK_STATUS_BADGE_VARIANTS[selected.status]}>
                  {FEEDBACK_STATUS_LABELS[selected.status]}
                </Badge>
                <span className="text-sm text-text-light ml-auto">
                  {new Date(selected.created_at).toLocaleDateString('es-MX')}
                </span>
              </div>

              <div className="flex items-center gap-1" aria-label={`Calificación: ${selected.rating} de 5`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    size={18}
                    className={value <= selected.rating ? 'fill-primary text-primary' : 'text-muted'}
                    aria-hidden
                  />
                ))}
                <span className="ml-2 text-sm text-text-light">{selected.rating}/5</span>
              </div>

              <p className="text-text whitespace-pre-wrap">{selected.comment}</p>

              <Select
                label="Estado"
                options={STATUS_OPTIONS.filter((option) => option.value !== '')}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
              />

              <Textarea
                label="Notas internas (opcional)"
                rows={3}
                maxLength={2000}
                placeholder="Comentarios internos del equipo..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setSelected(null)} disabled={saving}>
                  Cerrar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}
