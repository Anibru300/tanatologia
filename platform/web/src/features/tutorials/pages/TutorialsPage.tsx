import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GraduationCap, Play } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/features/auth/useAuth'
import type { Tutorial } from '@/features/tutorials/types'
import { AUDIENCE_LABELS } from '@/features/tutorials/types'
import { getSignedUrl, listPublished, trackProgress, trackStart } from '@/features/tutorials/tutorialService'
import { cn } from '@/lib/utils'

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

interface TutorialsPageProps {
  audience: 'patient' | 'professional'
}

export function TutorialsPage({ audience }: TutorialsPageProps) {
  const { user } = useAuth()
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [active, setActive] = useState<Tutorial | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listPublished(audience)
      setTutorials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los tutoriales.')
    } finally {
      setLoading(false)
    }
  }, [audience])

  useEffect(() => {
    load()
  }, [load])

  // Miniaturas firmadas de forma diferida (solo las que tienen thumbnail_path).
  useEffect(() => {
    let cancelled = false
    const withThumb = tutorials.filter((t) => t.thumbnail_path)
    if (withThumb.length === 0) return
    ;(async () => {
      const entries = await Promise.all(
        withThumb.map(async (t) => {
          const url = t.thumbnail_path ? await getSignedUrl(t.thumbnail_path) : null
          return [t.id, url] as const
        })
      )
      if (cancelled) return
      setThumbUrls((prev) => {
        const next = { ...prev }
        for (const [id, url] of entries) {
          if (url) next[id] = url
        }
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [tutorials])

  const categories = useMemo(
    () => Array.from(new Set(tutorials.map((t) => t.category).filter(Boolean))),
    [tutorials]
  )
  const filtered = useMemo(
    () => (categoryFilter === 'all' ? tutorials : tutorials.filter((t) => t.category === categoryFilter)),
    [tutorials, categoryFilter]
  )

  async function openTutorial(tutorial: Tutorial) {
    if (!tutorial.video_path) return
    setActive(tutorial)
    setVideoUrl('')
    const url = await getSignedUrl(tutorial.video_path)
    setVideoUrl(url ?? '')
  }

  function closeTutorial() {
    setActive(null)
    setVideoUrl('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Tutoriales</h1>
        <p className="text-text-light mt-1">
          Videos guiados para aprovechar SOMOS-CALMA al máximo.
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <div className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {!loading && !error && tutorials.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Todas" active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} />
          {categories.map((category) => (
            <FilterChip
              key={category}
              label={category}
              active={categoryFilter === category}
              onClick={() => setCategoryFilter(category)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aún no hay tutoriales disponibles"
          description="Estamos preparando contenido para ti. Vuelve pronto."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              thumbUrl={thumbUrls[tutorial.id]}
              onWatch={() => openTutorial(tutorial)}
            />
          ))}
        </div>
      )}

      <Modal
        open={active !== null}
        onClose={closeTutorial}
        title={active?.title}
        className="max-w-3xl"
      >
        {active && (
          <div className="space-y-4">
            {videoUrl ? (
              <TutorialPlayer
                tutorial={active}
                src={videoUrl}
                role={user?.role ?? audience}
              />
            ) : (
              <Skeleton className="w-full aspect-video rounded-md" />
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{active.category}</Badge>
                {active.duration_seconds && <Badge variant="info">{formatDuration(active.duration_seconds)}</Badge>}
                <Badge variant="default">{AUDIENCE_LABELS[active.audience]}</Badge>
              </div>
              {active.description && <p className="text-sm text-text-light">{active.description}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-surface text-text-light border-border hover:border-primary hover:text-text'
      )}
    >
      {label}
    </button>
  )
}

function TutorialCard({
  tutorial,
  thumbUrl,
  onWatch,
}: {
  tutorial: Tutorial
  thumbUrl?: string
  onWatch: () => void
}) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-bg-alt flex items-center justify-center">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Miniatura de ${tutorial.title}`}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl font-bold text-primary/40" aria-hidden>
            {tutorial.title.trim().charAt(0).toUpperCase()}
          </span>
        )}
        {tutorial.duration_seconds != null && tutorial.duration_seconds > 0 && (
          <span className="absolute bottom-2 right-2 bg-text/80 text-white text-xs font-medium px-2 py-0.5 rounded-sm">
            {formatDuration(tutorial.duration_seconds)}
          </span>
        )}
      </div>
      <CardContent className="flex flex-col flex-1 gap-2 pt-4">
        <Badge className="self-start">{tutorial.category}</Badge>
        <h3 className="font-semibold text-text">{tutorial.title}</h3>
        {tutorial.description && (
          <p className="text-sm text-text-light line-clamp-2">{tutorial.description}</p>
        )}
        <div className="mt-auto pt-2">
          <Button size="sm" onClick={onWatch} disabled={!tutorial.video_path}>
            <Play size={16} className="mr-2" />
            Ver tutorial
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const PROGRESS_THRESHOLDS = [25, 50, 75, 100] as const

function TutorialPlayer({
  tutorial,
  src,
  role,
}: {
  tutorial: Tutorial
  src: string
  role: string
}) {
  // Mayor porcentaje reportado (monotónico); la RLS exige avances no decrecientes.
  const maxSentRef = useRef(0)

  const send = useCallback(
    (percent: number) => {
      if (percent <= maxSentRef.current) return
      maxSentRef.current = percent
      void trackProgress(tutorial.id, percent)
    },
    [tutorial.id]
  )

  return (
    <video
      key={src}
      controls
      preload="metadata"
      playsInline
      className="w-full rounded-md bg-black"
      src={src}
      onPlay={() => {
        maxSentRef.current = 0
        void trackStart(tutorial.id, role)
      }}
      onTimeUpdate={(e) => {
        const video = e.currentTarget
        if (!video.duration || !Number.isFinite(video.duration)) return
        const percent = (video.currentTime / video.duration) * 100
        for (const threshold of PROGRESS_THRESHOLDS) {
          if (percent >= threshold) send(threshold)
        }
      }}
      onEnded={() => send(100)}
    />
  )
}
