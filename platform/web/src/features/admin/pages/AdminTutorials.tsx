import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GraduationCap, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/useAuth'
import type { Tutorial, TutorialAudience, TutorialFormData, TutorialStatus } from '@/features/tutorials/types'
import { AUDIENCE_LABELS, STATUS_LABELS } from '@/features/tutorials/types'
import {
  captureThumbnail,
  createTutorial,
  deleteTutorial,
  getSignedUrl,
  getStats,
  listAll,
  probeVideoDuration,
  removeMedia,
  updateTutorial,
  uploadThumbnail,
  uploadVideo,
  type TutorialStats,
} from '@/features/tutorials/tutorialService'

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as TutorialStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}))

const AUDIENCE_OPTIONS = (Object.keys(AUDIENCE_LABELS) as TutorialAudience[]).map((value) => ({
  value,
  label: AUDIENCE_LABELS[value],
}))

function statusVariant(status: TutorialStatus): 'success' | 'info' | 'warning' | 'default' | 'error' {
  switch (status) {
    case 'published':
      return 'success'
    case 'approved':
      return 'info'
    case 'in_review':
      return 'warning'
    case 'rejected':
      return 'error'
    default:
      return 'default'
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

const EMPTY_FORM: TutorialFormData = {
  title: '',
  description: '',
  audience: 'both',
  category: '',
  status: 'draft',
  sort_order: 0,
}

export function AdminTutorials() {
  const { user } = useAuth()
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [stats, setStats] = useState<Record<string, TutorialStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tutorial | null>(null)
  const [form, setForm] = useState<TutorialFormData>(EMPTY_FORM)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleting, setDeleting] = useState<Tutorial | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deletingLoading, setDeletingLoading] = useState(false)

  const [preview, setPreview] = useState<{ tutorial: Tutorial; url: string } | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(
    () => Array.from(new Set(tutorials.map((t) => t.category).filter(Boolean))),
    [tutorials]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listAll()
      setTutorials(data)
      const aggregated = await getStats(data.map((t) => t.id))
      setStats(aggregated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los tutoriales.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setVideoFile(null)
    setThumbFile(null)
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(tutorial: Tutorial) {
    setEditing(tutorial)
    setForm({
      title: tutorial.title,
      description: tutorial.description,
      audience: tutorial.audience,
      category: tutorial.category,
      status: tutorial.status,
      sort_order: tutorial.sort_order,
    })
    setVideoFile(null)
    setThumbFile(null)
    setFormError('')
    setFormOpen(true)
  }

  async function handleSubmit() {
    setFormError('')
    if (form.title.trim().length < 1) {
      setFormError('El título es obligatorio.')
      return
    }
    if (!form.category.trim()) {
      setFormError('La categoría es obligatoria.')
      return
    }
    // El constraint de la base de datos exige video_path para publicar;
    // se valida aquí para dar feedback antes del envío.
    const hasVideo = Boolean(videoFile) || Boolean(editing?.video_path)
    if (form.status === 'published' && !hasVideo) {
      setFormError('No se puede publicar un tutorial sin video. Carga el video o elige otro estado.')
      return
    }
    if (!editing && !videoFile) {
      setFormError('Debes cargar el video del tutorial.')
      return
    }

    setSaving(true)
    try {
      let tutorial = editing

      if (!tutorial) {
        tutorial = await createTutorial(form, user?.id ?? '')
      } else {
        await updateTutorial(tutorial.id, form)
      }

      const mediaPatch: {
        video_path?: string
        thumbnail_path?: string
        duration_seconds?: number | null
      } = {}

      if (videoFile && tutorial) {
        const videoPath = await uploadVideo(tutorial.id, videoFile)
        mediaPatch.video_path = videoPath
        const duration = await probeVideoDuration(videoFile)
        mediaPatch.duration_seconds = duration
        // Si no hay miniatura seleccionada, se genera automáticamente del video.
        if (!thumbFile) {
          const blob = await captureThumbnail(videoFile)
          if (blob) {
            mediaPatch.thumbnail_path = await uploadThumbnail(tutorial.id, blob)
          }
        }
      }

      if (thumbFile && tutorial) {
        mediaPatch.thumbnail_path = await uploadThumbnail(tutorial.id, thumbFile)
      }

      if (tutorial && Object.keys(mediaPatch).length > 0) {
        await updateTutorial(tutorial.id, mediaPatch)
      }

      setNotice(editing ? 'Tutorial actualizado correctamente.' : 'Tutorial creado correctamente.')
      setFormOpen(false)
      setVideoFile(null)
      setThumbFile(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el tutorial.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeletingLoading(true)
    setDeleteError('')
    try {
      await deleteTutorial(deleting.id)
      await removeMedia([deleting.video_path, deleting.thumbnail_path])
      setNotice(`Tutorial “${deleting.title}” eliminado.`)
      setDeleting(null)
      await load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el tutorial.')
    } finally {
      setDeletingLoading(false)
    }
  }

  async function openPreview(tutorial: Tutorial) {
    if (!tutorial.video_path) return
    const url = await getSignedUrl(tutorial.video_path)
    if (url) setPreview({ tutorial, url })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Tutoriales</h1>
          <p className="text-text-light mt-1">
            Administra los videos guiados de la plataforma y su audiencia.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Nuevo tutorial
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && (
        <Alert variant="success" autoDismiss={6000} onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap size={18} /> Catálogo de tutoriales
          </CardTitle>
          <CardDescription>
            Solo los tutoriales publicados con la audiencia adecuada son visibles en los portales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonRows count={5} />
          ) : (
            <DataTable<Tutorial>
              rows={tutorials}
              keyOf={(row) => row.id}
              emptyMessage="Aún no hay tutoriales registrados."
              columns={[
                {
                  header: 'Título',
                  render: (row) => <span className="text-text font-medium">{row.title}</span>,
                },
                {
                  header: 'Audiencia',
                  render: (row) => <Badge variant="info">{AUDIENCE_LABELS[row.audience]}</Badge>,
                },
                { header: 'Categoría', render: (row) => row.category },
                {
                  header: 'Estado',
                  render: (row) => <Badge variant={statusVariant(row.status)}>{STATUS_LABELS[row.status]}</Badge>,
                },
                {
                  header: 'Duración',
                  render: (row) => formatDuration(row.duration_seconds),
                },
                { header: 'Vistas', render: (row) => stats[row.id]?.views ?? 0 },
                { header: 'Completados', render: (row) => stats[row.id]?.completions ?? 0 },
                { header: 'Orden', render: (row) => row.sort_order },
                {
                  header: 'Acciones',
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      {row.video_path && (
                        <Button size="sm" variant="ghost" onClick={() => openPreview(row)}>
                          <Play size={14} className="mr-1" />
                          Ver
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button size="sm" variant="danger-outline" onClick={() => setDeleting(row)}>
                        <Trash2 size={14} className="mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* Formulario de creación / edición */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Editar tutorial' : 'Nuevo tutorial'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={200}
            placeholder="Ej. Cómo agendar tu primera cita"
          />
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            maxLength={1000}
            placeholder="Breve descripción de lo que aprenderá quien lo vea."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Audiencia"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as TutorialAudience })}
              options={AUDIENCE_OPTIONS}
            />
            <Input
              label="Categoría"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              maxLength={60}
              placeholder="Ej. Primeros pasos"
              list="tutorial-categories"
            />
            <datalist id="tutorial-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <Select
              label="Estado"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TutorialStatus })}
              options={STATUS_OPTIONS}
            />
            <Input
              label="Orden"
              type="number"
              min={0}
              value={String(form.sort_order)}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-text">
              Video {editing ? '(reemplazar, opcional)' : '*'}
            </span>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()}>
                Elegir video
              </Button>
              <span className="text-sm text-text-light">
                {videoFile ? videoFile.name : editing?.video_path ? 'Video actual cargado' : 'Sin video'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-text">Miniatura (opcional)</span>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => thumbInputRef.current?.click()}>
                Elegir imagen
              </Button>
              <span className="text-sm text-text-light">
                {thumbFile
                  ? thumbFile.name
                  : 'Si no eliges una, se genera automáticamente del video.'}
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tutorial'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Previsualización del video */}
      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.tutorial.title}
        className="max-w-3xl"
      >
        {preview && (
          <video
            key={preview.url}
            controls
            preload="metadata"
            playsInline
            className="w-full rounded-md bg-black"
            src={preview.url}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar tutorial"
        destructive
        loading={deletingLoading}
        message={
          <>
            Se eliminará <strong>“{deleting?.title}”</strong> junto con su video y miniatura. Esta
            acción no se puede deshacer.
            {deleteError && (
              <span className="block mt-2 text-error-dark">{deleteError}</span>
            )}
          </>
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleting(null)
          setDeleteError('')
        }}
      />
    </div>
  )
}
