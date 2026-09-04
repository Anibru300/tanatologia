import { supabase } from '@/lib/supabase'

export type PageViewRow = {
  path: string
  referrer: string | null
  session_key: string
  source: string
  device: string | null
  browser: string | null
  timezone: string | null
  created_at: string
}

export type SignupRow = {
  role: string
  timezone: string | null
  created_at: string
}

export type AnalyticsData = {
  /** Días del período seleccionado (el servicio trae el doble para calcular la tendencia). */
  days: number
  views: PageViewRow[]
  signups: SignupRow[]
  appointmentsCreated: { created_at: string; status: string }[]
}

export async function getAnalyticsData(days: number): Promise<AnalyticsData> {
  // Traemos 2× el rango: la primera mitad es el período anterior, para mostrar
  // la tendencia (flechas arriba/abajo) en los indicadores.
  const since = new Date(Date.now() - days * 2 * 86400_000).toISOString()

  const [viewsRes, signupsRes, apptsRes] = await Promise.all([
    supabase
      .from('page_views')
      .select('path, referrer, session_key, source, device, browser, timezone, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(10000),
    supabase.from('profiles').select('role, timezone, created_at').gte('created_at', since),
    supabase.from('appointments').select('created_at, status').gte('created_at', since),
  ])

  if (viewsRes.error) throw new Error(viewsRes.error.message)
  if (signupsRes.error) throw new Error(signupsRes.error.message)
  if (apptsRes.error) throw new Error(apptsRes.error.message)

  return {
    days,
    views: (viewsRes.data || []) as unknown as PageViewRow[],
    signups: (signupsRes.data || []) as unknown as SignupRow[],
    appointmentsCreated: (apptsRes.data || []) as unknown as AnalyticsData['appointmentsCreated'],
  }
}
