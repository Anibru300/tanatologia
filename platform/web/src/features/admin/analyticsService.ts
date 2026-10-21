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

  // OJO (fix 2026-10-21): PostgREST de Supabase limita a 1,000 filas por
  // petición (max-rows). Con orden ascendente, las 1,000 más antiguas llenaban
  // el cupo y los días recientes desaparecían del panel ("ayer y hoy en 0"
  // apenas la tabla pasó de 1,000 filas). Se pagina en rangos de 1,000 hasta
  // agotar el resultado (total máximo de seguridad: 50,000 filas).
  const PAGE = 1000
  const MAX_PAGES = 50

  const select = 'path, referrer, session_key, source, device, browser, timezone, created_at'
  const allViews: unknown[] = []
  for (let from = 0; from < PAGE * MAX_PAGES; from += PAGE) {
    const { data, error } = await supabase
      .from('page_views')
      .select(select)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    allViews.push(...data)
    if (data.length < PAGE) break
  }

  const [signupsRes, apptsRes] = await Promise.all([
    supabase.from('profiles').select('role, timezone, created_at').gte('created_at', since),
    supabase.from('appointments').select('created_at, status').gte('created_at', since),
  ])

  if (signupsRes.error) throw new Error(signupsRes.error.message)
  if (apptsRes.error) throw new Error(apptsRes.error.message)

  return {
    days,
    views: allViews as unknown as PageViewRow[],
    signups: (signupsRes.data || []) as unknown as SignupRow[],
    appointmentsCreated: (apptsRes.data || []) as unknown as AnalyticsData['appointmentsCreated'],
  }
}
