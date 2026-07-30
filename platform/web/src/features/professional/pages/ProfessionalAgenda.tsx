import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, ChevronRight, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  type Appointment,
} from '@/features/appointments/appointmentsService'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - day)
  return d
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function ProfessionalAgenda() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const professionalProfileId = await getProfessionalProfileId(userId)
        if (!professionalProfileId) {
          throw new Error('No se encontró tu perfil profesional.')
        }
        const data = await getAppointmentsForProfessional(professionalProfileId)
        if (!cancelled) setAppointments(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando citas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date())
    monday.setDate(monday.getDate() + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekOffset])

  const weekLabel = useMemo(() => {
    const first = weekDays[0]
    const last = weekDays[6]
    const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    return `${fmt(first)} – ${fmt(last)}`
  }, [weekDays])

  const appointmentsByDay = useMemo(() => {
    const map = new Map<number, Appointment[]>()
    weekDays.forEach((day, idx) => {
      const items = appointments
        .filter((a) => sameDay(new Date(a.scheduled_at), day))
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      map.set(idx, items)
    })
    return map
  }, [appointments, weekDays])

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const today = new Date()

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Agenda</h1>
            <p className="text-text-light">Vista semanal de tus citas.</p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="sm" aria-label="Semana anterior" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft size={18} />
            </Button>
            <span className="text-text font-medium capitalize min-w-[140px] text-center">{weekLabel}</span>
            <Button variant="outline" size="sm" aria-label="Semana siguiente" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight size={18} />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                Hoy
              </Button>
            )}
          </div>
        </div>

        {loading && <p className="text-text-light mb-4">Cargando citas...</p>}
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">Semana del {weekLabel}</CardTitle>
              <CardDescription>Citas programadas por día.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {weekDays.map((day, idx) => {
                  const items = appointmentsByDay.get(idx) || []
                  const isToday = sameDay(day, today)
                  return (
                    <div
                      key={idx}
                      className={`rounded-sm p-3 min-h-[120px] ${isToday ? 'bg-primary/10 ring-1 ring-primary' : 'bg-bg-alt'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-text-light">{DAY_NAMES[idx]}</span>
                        <span className={`text-sm font-semibold ${isToday ? 'text-primary-dark' : 'text-text'}`}>
                          {day.getDate()}
                        </span>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-xs text-muted">Sin citas</p>
                      ) : (
                        <div className="space-y-2">
                          {items.map((a) => (
                            <div key={a.id} className="bg-surface rounded-xs p-2 shadow-sm">
                              <p className="text-xs font-semibold text-text">{formatTime(a.scheduled_at)} hrs</p>
                              <p className="text-xs text-text-light truncate" title={a.patientName}>
                                {a.patientName}
                              </p>
                              <div className="flex items-center justify-between mt-1 gap-1">
                                <Badge variant={a.status === 'confirmed' ? 'success' : a.status === 'cancelled' ? 'error' : 'warning'}>
                                  {STATUS_LABELS[a.status] || a.status}
                                </Badge>
                                {a.video_link && a.status === 'confirmed' && (
                                  <Link to={`/profesional/sala/${a.id}`} aria-label={`Entrar a la sala con ${a.patientName}`}>
                                    <Video size={14} className="text-primary-dark" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
