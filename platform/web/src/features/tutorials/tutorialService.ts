import { supabase } from '@/lib/supabase'
import type { Tutorial, TutorialFormData } from './types'

type AudienceRole = 'patient' | 'professional'

/** Tutoriales visibles para un rol: publicados y con audiencia propia o 'both'.
 *  La RLS de Supabase refuerza este filtro del lado servidor. */
export async function listPublished(audience: AudienceRole): Promise<Tutorial[]> {
  const { data, error } = await supabase
    .from('tutorials')
    .select('*')
    .eq('status', 'published')
    .in('audience', [audience, 'both'])
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Tutorial[]
}

/** Listado completo para administración (RLS admin). */
export async function listAll(): Promise<Tutorial[]> {
  const { data, error } = await supabase
    .from('tutorials')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Tutorial[]
}

/** URL firmada (1 h) de un objeto del bucket privado `tutorials`. */
export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('tutorials').createSignedUrl(path, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/** Registra el inicio de visualización. Si ya existe la fila (UNIQUE), se ignora. */
export async function trackStart(tutorialId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from('tutorial_views')
    .insert({ tutorial_id: tutorialId, role, percent_watched: 0 })
  // 23505 = unique_violation: el usuario ya inició este tutorial antes.
  if (error && error.code !== '23505') {
    // La analítica nunca debe romper la reproducción; solo se registra en consola.
    console.warn('No se pudo registrar el inicio del tutorial:', error.message)
  }
}

/** Actualiza el porcentaje visto (la RLS exige que sea >= al valor previo). */
export async function trackProgress(tutorialId: string, percent: number): Promise<void> {
  const { error } = await supabase
    .from('tutorial_views')
    .update({ percent_watched: Math.max(0, Math.min(100, Math.round(percent))) })
    .eq('tutorial_id', tutorialId)
  if (error) {
    console.warn('No se pudo registrar el avance del tutorial:', error.message)
  }
}

export interface TutorialStats {
  views: number
  completions: number
}

/** Agregados de visualización (views y completados >= 90%) por tutorial. */
export async function getStats(tutorialIds: string[]): Promise<Record<string, TutorialStats>> {
  const stats: Record<string, TutorialStats> = {}
  for (const id of tutorialIds) stats[id] = { views: 0, completions: 0 }
  if (tutorialIds.length === 0) return stats

  const { data, error } = await supabase
    .from('tutorial_views')
    .select('tutorial_id, percent_watched')
    .in('tutorial_id', tutorialIds)
  if (error) throw error

  for (const row of data ?? []) {
    const entry = stats[row.tutorial_id]
    if (!entry) continue
    entry.views += 1
    if ((row.percent_watched ?? 0) >= 90) entry.completions += 1
  }
  return stats
}

/** Crea el registro del tutorial. */
export async function createTutorial(
  data: TutorialFormData,
  createdBy: string
): Promise<Tutorial> {
  const { data: row, error } = await supabase
    .from('tutorials')
    .insert({
      title: data.title.trim(),
      description: data.description.trim(),
      audience: data.audience,
      category: data.category.trim(),
      status: data.status,
      sort_order: data.sort_order,
      created_by: createdBy,
      published_at: data.status === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single()
  if (error) throw error
  return row as Tutorial
}

/** Actualiza campos del tutorial. */
export async function updateTutorial(
  id: string,
  patch: Partial<TutorialFormData> & {
    video_path?: string | null
    thumbnail_path?: string | null
    duration_seconds?: number | null
  }
): Promise<void> {
  const payload: Record<string, unknown> = { ...patch }
  if (patch.status === 'published') {
    // Conserva la primera fecha de publicación si ya existía.
    const { data: current } = await supabase
      .from('tutorials')
      .select('published_at')
      .eq('id', id)
      .single()
    if (current && !current.published_at) {
      payload.published_at = new Date().toISOString()
    }
  }
  const { error } = await supabase.from('tutorials').update(payload).eq('id', id)
  if (error) throw error
}

/** Elimina el registro del tutorial. */
export async function deleteTutorial(id: string): Promise<void> {
  const { error } = await supabase.from('tutorials').delete().eq('id', id)
  if (error) throw error
}

/** Sube el video del tutorial al bucket privado. Devuelve el path en Storage. */
export async function uploadVideo(tutorialId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'mp4').replace(/^\./, '') || 'mp4'
  const path = `tutorials/${tutorialId}/video.${ext}`
  // Objeto aparte: la versión instalada de storage-js no declara `resumable` en FileOptions,
  // pero el servidor lo acepta (subida reanudable vía tus) para videos grandes.
  const options = { upsert: true, resumable: true }
  const { error } = await supabase.storage.from('tutorials').upload(path, file, options)
  if (error) throw error
  return path
}

/** Sube la miniatura del tutorial. Devuelve el path en Storage. */
export async function uploadThumbnail(tutorialId: string, blob: Blob): Promise<string> {
  const path = `tutorials/${tutorialId}/thumb.jpg`
  const { error } = await supabase.storage.from('tutorials').upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
  })
  if (error) throw error
  return path
}

/** Elimina objetos de Storage (ignora paths vacíos o nulos). */
export async function removeMedia(paths: (string | null | undefined)[]): Promise<void> {
  const toRemove = paths.filter((p): p is string => Boolean(p && p.trim().length > 0))
  if (toRemove.length === 0) return
  const { error } = await supabase.storage.from('tutorials').remove(toRemove)
  if (error) throw error
}

/** Obtiene la duración (segundos) del video cargando su metadata. */
export function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    const cleanup = () => URL.revokeObjectURL(url)
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null
      cleanup()
      resolve(duration)
    }
    video.onerror = () => {
      cleanup()
      resolve(null)
    }
    video.src = url
  })
}

/** Captura una miniatura JPEG del video (canvas de 640 px de ancho). */
export function captureThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.src = ''
    }
    const fail = () => {
      cleanup()
      resolve(null)
    }
    video.onerror = fail
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      video.currentTime = Math.min(1, duration * 0.1)
    }
    video.onseeked = () => {
      try {
        const scale = 640 / (video.videoWidth || 640)
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) return fail()
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            cleanup()
            resolve(blob)
          },
          'image/jpeg',
          0.8
        )
      } catch {
        fail()
      }
    }
    video.src = url
  })
}
