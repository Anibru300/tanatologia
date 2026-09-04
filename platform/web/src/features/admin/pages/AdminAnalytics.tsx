import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import {
  Eye, Users, MonitorSmartphone, UserPlus, Globe,
  MousePointerClick, TrendingUp, TrendingDown, MapPin, Flag,
} from 'lucide-react'
import { getAnalyticsData, type AnalyticsData } from '../analyticsService'
import { geoFromTimezone } from '@/lib/timezoneGeo'

const RANGES = [
  { key: 7, label: '7 días' },
  { key: 30, label: '30 días' },
  { key: 90, label: '90 días' },
] as const

// Paleta de marca (hex de tailwind.config.js) para las gráficas SVG
const C = {
  primary: '#8BAE7A',
  primaryDark: '#5F6F55',
  secondary: '#7A9AA8',
  secondaryDark: '#4E6A77',
  accent: '#C9A28E',
  accentDark: '#8F6B56',
  success: '#7A9E7E',
  warning: '#D4A373',
  error: '#C1666B',
}
const SERIES_COLORS = [C.primary, C.secondary, C.accent, C.success, C.warning, C.secondaryDark, C.accentDark]

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

type DayPoint = { label: string; value: number; subValue?: number }

/** Gráfica de área apilada (SVG): `value` = sitio, `subValue` = app. */
function AreaChart({ series }: { series: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 100
  const H = 42
  const n = series.length
  const max = Math.max(1, ...series.map((s) => s.value + (s.subValue ?? 0)))
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const ySite = (i: number) => H - 1 - (series[i].value / max) * (H - 4)
  const yTotal = (i: number) => H - 1 - ((series[i].value + (series[i].subValue ?? 0)) / max) * (H - 4)

  const siteArea = series.length
    ? `M 0 ${H} L ${series.map((_, i) => `${x(i)} ${ySite(i)}`).join(' L ')} L ${W} ${H} Z`
    : ''
  const appArea = series.length
    ? `M ${x(0)} ${ySite(0)} L ${series.map((_, i) => `${x(i)} ${yTotal(i)}`).join(' L ')} L ${x(n - 1)} ${ySite(n - 1)} Z`
    : ''
  const siteLine = series.map((_, i) => `${x(i)} ${ySite(i)}`).join(' L ')
  const appLine = series.map((_, i) => `${x(i)} ${yTotal(i)}`).join(' L ')

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left) / rect.width) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-44 cursor-crosshair"
        role="img"
        aria-label="Gráfica de área de visitas por día"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="gradSite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity="0.45" />
            <stop offset="100%" stopColor={C.primary} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="gradApp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.secondary} stopOpacity="0.55" />
            <stop offset="100%" stopColor={C.secondary} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#EDE8E1" strokeWidth="0.3" />
        ))}
        <path d={siteArea} fill="url(#gradSite)" />
        <path d={appArea} fill="url(#gradApp)" />
        <path d={`M ${siteLine}`} fill="none" stroke={C.primaryDark} strokeWidth="0.7" strokeLinejoin="round" />
        <path d={`M ${appLine}`} fill="none" stroke={C.secondaryDark} strokeWidth="0.7" strokeLinejoin="round" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke={C.accentDark} strokeWidth="0.4" strokeDasharray="1.5 1" />
        )}
        {hover !== null && (
          <>
            <circle cx={x(hover)} cy={ySite(hover)} r="1.1" fill={C.primaryDark} />
            <circle cx={x(hover)} cy={yTotal(hover)} r="1.1" fill={C.secondaryDark} />
          </>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-text-light mt-1 px-0.5">
        <span>{series[0]?.label}</span>
        <span>{series[Math.floor((n - 1) / 2)]?.label}</span>
        <span>{series[n - 1]?.label}</span>
      </div>
      {hover !== null && series[hover] && (
        <div className="absolute top-0 right-0 bg-text text-white text-[11px] rounded-md px-2.5 py-1.5 shadow-lg pointer-events-none z-10">
          <p className="font-semibold mb-0.5">{series[hover].label}</p>
          <p>Sitio: {series[hover].value}</p>
          <p>App: {series[hover].subValue ?? 0}</p>
          <p className="text-white/80">Total: {series[hover].value + (series[hover].subValue ?? 0)}</p>
        </div>
      )}
    </div>
  )
}

/** Gráfica de dona con leyenda y porcentajes. */
function Donut({ items, centerLabel }: { items: { label: string; value: number }[]; centerLabel: string }) {
  const total = items.reduce((a, b) => a + b.value, 0)
  const size = 140
  const r = 54
  const circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`Gráfica de ${centerLabel}`}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="#EDE8E1" strokeWidth="16" />
          {total > 0 &&
            items.slice(0, 6).map((it, i) => {
              const frac = it.value / total
              const dash = `${frac * circ} ${circ}`
              const offset = -acc * circ
              acc += frac
              return (
                <circle
                  key={it.label}
                  cx="70" cy="70" r={r} fill="none"
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth="16"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  transform="rotate(-90 70 70)"
                />
              )
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-text">{total}</span>
          <span className="text-[10px] text-text-light text-center leading-tight px-6">{centerLabel}</span>
        </div>
      </div>
      <ul className="space-y-1.5 min-w-0 flex-1">
        {items.slice(0, 6).map((it, i) => (
          <li key={it.label} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            <span className="text-text truncate" title={it.label}>{it.label}</span>
            <span className="text-text-light ml-auto shrink-0">
              {it.value} · {total > 0 ? Math.round((it.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
        {items.length > 6 && <li className="text-xs text-text-light">+{items.length - 6} más</li>}
      </ul>
    </div>
  )
}

function BarChart({ series, height = 150 }: { series: DayPoint[]; height?: number }) {
  const max = Math.max(1, ...series.map((s) => s.value + (s.subValue ?? 0)))
  return (
    <div>
      <div className="flex items-end gap-[3px] w-full overflow-x-auto pb-1" style={{ height }} role="img" aria-label="Gráfica de barras">
        {series.map((s) => (
          <div key={s.label} className="flex-1 min-w-[12px] flex flex-col items-center justify-end gap-0.5 h-full group relative">
            <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-text text-white text-[10px] rounded-sm px-1.5 py-0.5 whitespace-nowrap z-10 pointer-events-none">
              {s.label}: {s.value} pacientes{s.subValue ? ` + ${s.subValue} prof.` : ''}
            </div>
            <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
              {s.subValue !== undefined && (
                <div
                  className="w-full rounded-t-sm"
                  style={{ height: `${(s.subValue / max) * 100}%`, minHeight: s.subValue > 0 ? 2 : 0, backgroundColor: C.secondary }}
                  title={s.label}
                />
              )}
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${(s.value / max) * 100}%`, minHeight: s.value > 0 ? 2 : 0, backgroundColor: C.primary }}
                title={s.label}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-text-light mt-1 px-0.5">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
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
                <div className="h-full rounded-full" style={{ width: `${total > 0 ? (it.value / total) * 100 : 0}%`, backgroundColor: C.primary }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, color, label, value, trend }: {
  icon: ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  color: string
  label: string
  value: string | number
  trend: number | null
}) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <p className="flex items-center gap-2 text-text-light text-sm mb-1">
          <Icon size={16} style={{ color }} /> {label}
        </p>
        <p className="text-2xl font-bold text-text">{value}</p>
        {trend !== null ? (
          <p className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? 'text-success-dark' : 'text-error'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}% vs período anterior
          </p>
        ) : (
          <p className="text-xs text-text-light mt-1">Sin período anterior para comparar</p>
        )}
      </CardContent>
    </Card>
  )
}

function Funnel({ steps }: { steps: { label: string; value: number; hint: string }[] }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : 0
        const conv = i > 0 && prev > 0 ? Math.round((s.value / prev) * 100) : null
        const width = steps[0].value > 0 ? Math.max(18, (s.value / steps[0].value) * 100) : 18
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text font-medium">{s.label}</span>
              <span className="text-text-light">
                <span className="font-semibold text-text">{s.value}</span>
                {conv !== null && <span className="ml-2 text-xs">↓ {conv}% conversión</span>}
              </span>
            </div>
            <div className="h-8 bg-bg-alt rounded-md overflow-hidden">
              <div
                className="h-full rounded-md flex items-center justify-end pr-2 transition-all"
                style={{ width: `${width}%`, backgroundColor: [C.primary, C.secondary, C.accent][i % 3] }}
              >
                <span className="text-[10px] text-white font-medium whitespace-nowrap">{s.hint}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando los datos')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  const cutoff = useMemo(() => Date.now() - range * 86400_000, [range])

  const stats = useMemo(() => {
    if (!data) return null
    const curViews = data.views.filter((v) => new Date(v.created_at).getTime() >= cutoff)
    const prevViews = data.views.filter((v) => new Date(v.created_at).getTime() < cutoff)
    const curSignups = data.signups.filter((s) => new Date(s.created_at).getTime() >= cutoff)
    const prevSignups = data.signups.filter((s) => new Date(s.created_at).getTime() < cutoff)
    const curAppts = data.appointmentsCreated.filter((a) => new Date(a.created_at).getTime() >= cutoff)

    const curSessions = new Set(curViews.map((v) => v.session_key)).size
    const prevSessions = new Set(prevViews.map((v) => v.session_key)).size

    return {
      totalViews: curViews.length,
      prevViews: prevViews.length,
      sessions: curSessions,
      prevSessions,
      viewsPerSession: curSessions > 0 ? (curViews.length / curSessions).toFixed(1) : '0',
      signups: curSignups.length,
      prevSignups: prevSignups.length,
      currentSignups: curSignups,
      currentViews: curViews,
      currentAppts: curAppts,
    }
  }, [data, cutoff])

  const viewsByDay = useMemo(() => {
    const series = buildDaySeries(range)
    const count = new Map<string, number>()
    const appCount = new Map<string, number>()
    for (const v of stats?.currentViews ?? []) {
      const key = dayKey(new Date(v.created_at))
      if (v.source === 'app') appCount.set(key, (appCount.get(key) ?? 0) + 1)
      else count.set(key, (count.get(key) ?? 0) + 1)
    }
    return series.map((s) => ({ label: s.label, value: count.get(s.key) ?? 0, subValue: appCount.get(s.key) ?? 0 }))
  }, [stats, range])

  const signupsByDay = useMemo(() => {
    const series = buildDaySeries(range)
    const patients = new Map<string, number>()
    const pros = new Map<string, number>()
    for (const s of stats?.currentSignups ?? []) {
      const key = dayKey(new Date(s.created_at))
      if (s.role === 'professional') pros.set(key, (pros.get(key) ?? 0) + 1)
      else patients.set(key, (patients.get(key) ?? 0) + 1)
    }
    return series.map((s) => ({ label: s.label, value: patients.get(s.key) ?? 0, subValue: pros.get(s.key) ?? 0 }))
  }, [stats, range])

  const referrers = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of stats?.currentViews ?? []) {
      const label = v.referrer ? new URL(v.referrer).hostname.replace(/^www\./, '') : 'Acceso directo'
      count.set(label, (count.get(label) ?? 0) + 1)
    }
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7)
  }, [stats])

  const topPaths = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of stats?.currentViews ?? []) {
      // Normaliza rutas de la app: /app/#/ruta → /#/ruta
      const clean = v.path.replace(/^\/app/, '')
      count.set(clean, (count.get(clean) ?? 0) + 1)
    }
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [stats])

  const visitCountries = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of stats?.currentViews ?? []) {
      const geo = geoFromTimezone(v.timezone)
      count.set(geo.country, (count.get(geo.country) ?? 0) + 1)
    }
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [stats])

  const signupCountries = useMemo(() => {
    const count = new Map<string, number>()
    for (const s of stats?.currentSignups ?? []) {
      const geo = geoFromTimezone(s.timezone)
      count.set(geo.country, (count.get(geo.country) ?? 0) + 1)
    }
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7)
  }, [stats])

  const signupCities = useMemo(() => {
    const count = new Map<string, number>()
    for (const s of stats?.currentSignups ?? []) {
      const geo = geoFromTimezone(s.timezone)
      count.set(geo.city, (count.get(geo.city) ?? 0) + 1)
    }
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7)
  }, [stats])

  const devices = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of stats?.currentViews ?? []) count.set(v.device || 'desconocido', (count.get(v.device || 'desconocido') ?? 0) + 1)
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [stats])

  const browsers = useMemo(() => {
    const count = new Map<string, number>()
    for (const v of stats?.currentViews ?? []) count.set(v.browser || 'desconocido', (count.get(v.browser || 'desconocido') ?? 0) + 1)
    return [...count.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [stats])

  const appointmentSummary = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const a of stats?.currentAppts ?? []) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
    }
    return byStatus
  }, [stats])

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
            <h1 className="text-3xl font-bold text-text mb-2">Flujo de la página</h1>
            <p className="text-text-light">
              Visitas, origen y geografía del tráfico, registros y conversión de la plataforma.
              Datos propios (first-party), complementarios a Google Analytics 4.
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
              <Kpi icon={Eye} color={C.primary} label="Visitas" value={stats.totalViews} trend={pctChange(stats.totalViews, stats.prevViews)} />
              <Kpi icon={Users} color={C.secondary} label="Sesiones únicas" value={stats.sessions} trend={pctChange(stats.sessions, stats.prevSessions)} />
              <Kpi icon={MousePointerClick} color={C.accent} label="Vistas por sesión" value={stats.viewsPerSession} trend={null} />
              <Kpi icon={UserPlus} color={C.warning} label="Registros nuevos" value={stats.signups} trend={pctChange(stats.signups, stats.prevSignups)} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Flujo de visitas por día</CardTitle>
                  <CardDescription>
                    Sitio (verde) y app (azul) apiladas. Pasa el cursor sobre la gráfica.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.totalViews === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">
                      Aún no hay visitas registradas en este período. El tracking se activó recientemente:
                      cada visita nueva al sitio y a la app aparecerá aquí.
                    </p>
                  ) : (
                    <AreaChart series={viewsByDay} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe size={18} className="text-primary" />
                    De dónde nos visitan
                  </CardTitle>
                  <CardDescription>Sitios de origen (referrers) de las visitas</CardDescription>
                </CardHeader>
                <CardContent>
                  {referrers.length === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">Sin datos en este período.</p>
                  ) : (
                    <Donut items={referrers} centerLabel="visitas con origen conocido" />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Registros por día</CardTitle>
                  <CardDescription>Pacientes (verde) y profesionales (azul)</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.signups === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">Sin registros en este período.</p>
                  ) : (
                    <BarChart series={signupsByDay} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointerClick size={18} className="text-primary" />
                    Embudo de conversión
                  </CardTitle>
                  <CardDescription>De la visita a la cita agendada en el período</CardDescription>
                </CardHeader>
                <CardContent>
                  <Funnel
                    steps={[
                      { label: 'Visitas', value: stats.totalViews, hint: '100%' },
                      { label: 'Registros', value: stats.signups, hint: `${stats.totalViews > 0 ? Math.round((stats.signups / stats.totalViews) * 100) : 0}% de las visitas` },
                      { label: 'Citas creadas', value: stats.currentAppts.length, hint: `${stats.signups > 0 ? Math.round((stats.currentAppts.length / stats.signups) * 100) : 0}% de los registros` },
                    ]}
                  />
                  {Object.keys(appointmentSummary).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-bg-alt">
                      <p className="text-xs text-text-light mb-2">Citas por estado:</p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1">
                        {Object.entries(appointmentSummary)
                          .sort((a, b) => b[1] - a[1])
                          .map(([status, count]) => (
                            <li key={status} className="text-xs text-text">
                              <span className="text-text-light">{STATUS_LABELS[status] || status}:</span>{' '}
                              <span className="font-semibold">{count}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag size={18} className="text-primary" />
                    Países (visitas)
                  </CardTitle>
                  <CardDescription>Según la zona horaria del navegador, sin usar IP</CardDescription>
                </CardHeader>
                <CardContent>
                  {visitCountries.length === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">Sin datos en este período.</p>
                  ) : (
                    <Donut items={visitCountries} centerLabel="visitas por país" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag size={18} className="text-primary" />
                    Países (registros)
                  </CardTitle>
                  <CardDescription>Ubicación aproximada de las cuentas nuevas</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopList title="" icon={Flag} items={signupCountries} total={stats.signups} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin size={18} className="text-primary" />
                    Ciudades (registros)
                  </CardTitle>
                  <CardDescription>
                    Ciudad principal según zona horaria. Los registros previos al 04-sep-2026 aparecen como "Desconocido".
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TopList title="" icon={MapPin} items={signupCities} total={stats.signups} />
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Páginas más vistas</CardTitle>
                  <CardDescription>Rutas con más visitas en el período</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopList title="" icon={Eye} items={topPaths} total={stats.totalViews} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MonitorSmartphone size={18} className="text-primary" />
                    Dispositivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {devices.length === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">Sin datos en este período.</p>
                  ) : (
                    <Donut items={devices} centerLabel="visitas" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Navegadores</CardTitle>
                </CardHeader>
                <CardContent>
                  {browsers.length === 0 ? (
                    <p className="text-sm text-text-light py-8 text-center">Sin datos en este período.</p>
                  ) : (
                    <TopList title="" icon={MonitorSmartphone} items={browsers} total={stats.totalViews} />
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
