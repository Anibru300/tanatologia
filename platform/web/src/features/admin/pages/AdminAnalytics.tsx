import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Eye, Users, MonitorSmartphone, UserPlus, CalendarPlus, Globe, MousePointerClick } from 'lucide-react'
import { getAnalyticsData, type AnalyticsData } from '../analyticsService'

const RANGES = [
  { key: 7, label: '7 días' },
  { key: 30, label: '30 días' },
  { key: 90, label: '90 días' },
] as const

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function buildDaySeries(days: number) {
  const out: { key: string; label: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    out.push({ key: dayKey(d), label: dayLabel(dayKey(d)) })
  }
  return out
}

function BarChart({
  series,
  height = 140,
}: {
  series: { label: string; value: number; subValue?: number }[]
  height?: number
}) {
  const max = Math.max(1, ...series.map((s) => s.value + (s.subValue ?? 0)))
  return (
    <div className="flex items-end gap-1 w-full overflow-x-auto pb-1" style={{ height }} role="img" aria-label="Gráfica de barras">
      {series.map((s) => (
        <div key={s.label} className="flex-1 min-w-[14px] flex flex-col items-center justify-end gap-0.5 h-full group relative">
          <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-text text-white text-[10px] rounded-sm px-1.5 py-0.5 whitespace-nowrap z-10 pointer-events-none">
            {s.label}: {s.value}{s.subValue ? ` (+${s.subValue})` : ''}
          </div>
          <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
            {s.subValue !== undefined && (
              <div
                className="w-full bg-secondary/70 rounded-t-sm"
                style={{ height: `${(s.subValue / max) * 100}%`, minHeight: s.subValue > 0 ? 2 : 0 }}
                title={s.label}
              />
            )}
            <div
              className={`w-full rounded-t-sm ${s.subValue !== undefined ? 'bg-primary' : 'bg-primary/70'}`}
              style={{ height: `${(s.value / max) * 100}%`, minHeight: s.value > 0 ? 2 : 0 }}
              title={s.label}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function TopList({ title, icon: Icon, items, total }: {
  title: string
  icon: ComponentType<{ size?: number; className?: string }>
  items: { label: string; value: number }[]
  total: number
}) {
  return (
    <div>
      {title && (
        <h4 className="font-semibold text-text mb-3 flex items-center gap-2">
          <Icon size={16} className="text-primary" />
          {title}
        </h4>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-text-light">Sin datos en este período.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.label} className="text-sm">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-text truncate pr-2" title={it.label}>{it.label}</span>
                <span className="text-text-light shrink-0">{it.value} · {total > 0 ? Math.round((it.value / total) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${total > 0 ? (it.value / total) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AdminAnalytics() {
  const [range, setRange] = useState<number>(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getAnalyticsData(range)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando analíticas')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  const stats = useMemo(() => {
    if (!data) return null
    const sessions = new Set(data.views.map((v) => v.session_key))
    const totalViews = data.views.length
    return {
      totalViews,
      sessions: sessions.size,
      viewsPerSession: sessions.size > 0 ? (totalViews / sessions.size).toFixed(1) : '0',
      signups: data.signups.length,
    }
  }, [data])

  const viewsByDay = useMemo(() => {
    const series = buildDaySeries(range)
    const count = new Map<string, number>()
    const appCount = new Map<string, number>()
    for (const v of data?.views ?? []) {
      const key = dayKey(new Date(v.created_at))
      if (v.source === 'app') appCount.set(key, (appCount.get(key) ?? 0) + 1)
      else count.set(key, (count.get(key) ?? 0) + 1)
    }
    return series.map((s) => ({ label: s.label, value: count.get(s.key) ?? 0, subValue: appCount.get(s.key) ?? 0 }))
  }, [data, range])

  const signupsByDay = useMemo(() => {
    const series = buildDaySeries(range)
    const patients = new Map<string, number>()
    const pros = new Map<string, number>()
    for (const s of data?.signups ?? []) {
      const key = dayKey(new Date(s.created_at))
      if (s.role === 'professional') pros.set(key, (pros.get(key) ?? 0) + 1)
      else patients.set(key, (patients.get(key) ?? 0) + 1)
    }
    return series.map((s) => ({ label: s.label, value: patients.get(s.key) ?? 0, subValue: pros.get(s.key) ?? 0 }))
  }, [data, range])

  const referrers = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of data?.views ?? []) {
      const label = v.referrer ? new URL(v.referrer).hostname.replace(/^www\./, '') : 'Acceso directo'
      count.set(label, (count.get(label) ?? 0) + 1)
    }
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [data])

  const topPaths = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of data?.views ?? []) {
      // Normaliza rutas de la app: /app/#/ruta → /#/ruta
      const clean = v.path.replace(/^\/app/, '')
      count.set(clean, (count.get(clean) ?? 0) + 1)
    }
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [data])

  const devices = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of data?.views ?? []) count.set(v.device || 'desconocido', (count.get(v.device || 'desconocido') ?? 0) + 1)
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [data])

  const browsers = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of data?.views ?? []) count.set(v.browser || 'desconocido', (count.get(v.browser || 'desconocido') ?? 0) + 1)
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [data])

  const appointmentSummary = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const a of data?.appointmentsCreated ?? []) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
    }
    return byStatus
  }, [data])

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendientes',
    confirmed: 'Confirmadas',
    completed: 'Completadas',
    cancelled: 'Canceladas',
    no_show: 'Sin asistencia',
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Analíticas</h1>
            <p className="text-text-light">
              Visitas, origen del tráfico y actividad de la plataforma. Datos propios (first-party),
              complementarios a Google Analytics 4.
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Rango de fechas">
            {RANGES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={range === r.key}
                onClick={() => setRange(r.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  range === r.key ? 'bg-primary-dark text-white' : 'bg-bg-alt text-text-light hover:text-text'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}
        {loading && <p className="text-text-light mb-6">Cargando datos...</p>}

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-text-light text-sm mb-1"><Eye size={16} className="text-primary" /> Visitas</p>
                  <p className="text-2xl font-bold text-text">{stats.totalViews}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-secondary">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-text-light text-sm mb-1"><Users size={16} className="text-secondary" /> Sesiones únicas</p>
                  <p className="text-2xl font-bold text-text">{stats.sessions}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-accent">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-text-light text-sm mb-1"><MousePointerClick size={16} className="text-accent" /> Vistas por sesión</p>
                  <p className="text-2xl font-bold text-text">{stats.viewsPerSession}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-text-light text-sm mb-1"><UserPlus size={16} className="text-warning" /> Registros nuevos</p>
                  <p className="text-2xl font-bold text-text">{stats.signups}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Flujo de visitas por día</CardTitle>
                  <CardDescription>
                    Sitio (claro) y app (oscuro). Pasa el cursor sobre cada barra.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.totalViews === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">
                      Aún no hay visitas registradas en este período. El tracking se activó recientemente:
                      cada visita nueva al sitio y a la app aparecerá aquí.
                    </p>
                  ) : (
                    <BarChart series={viewsByDay} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Registros por día</CardTitle>
                  <CardDescription>Pacientes (claro) y profesionales (oscuro)</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.signups === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">Sin registros en este período.</p>
                  ) : (
                    <BarChart series={signupsByDay} />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe size={18} className="text-primary" />
                    De dónde nos visitan
                  </CardTitle>
                  <CardDescription>Sitios de origen (referrers) de las visitas</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopList title="" icon={Globe} items={referrers} total={stats.totalViews} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Páginas más vistas</CardTitle>
                  <CardDescription>Rutas con más visitas en el período</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopList title="" icon={Eye} items={topPaths} total={stats.totalViews} />
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MonitorSmartphone size={18} className="text-primary" />
                    Dispositivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TopList title="" icon={MonitorSmartphone} items={devices} total={stats.totalViews} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Navegadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopList title="" icon={Eye} items={browsers} total={stats.totalViews} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarPlus size={18} className="text-primary" />
                    Citas creadas
                  </CardTitle>
                  <CardDescription>Agendadas en el período, por estado</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(appointmentSummary).length === 0 ? (
                    <p className="text-sm text-text-light">Sin citas nuevas en este período.</p>
                  ) : (
                    <ul className="space-y-2">
                      {Object.entries(appointmentSummary)
                        .sort((a, b) => b[1] - a[1])
                        .map(([status, count]) => (
                          <li key={status} className="flex items-center justify-between text-sm">
                            <span className="text-text">{STATUS_LABELS[status] || status}</span>
                            <span className="font-semibold text-text">{count}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
