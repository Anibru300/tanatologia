import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Clock, Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import {
  getMyAvailability,
  addSlot,
  deleteSlot,
  SLOT_DURATION_MINUTES,
  type AvailabilitySlot,
} from '@/features/availability/availabilityService'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] // semana inicia en lunes

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatSelectedDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ProfessionalAvailability() {
  const { user } = useAuth()

  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AvailabilitySlot | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const today = startOfToday()
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [newTime, setNewTime] = useState('09:00')

  // Slots agrupados por fecha local 'YYYY-MM-DD'.
  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    for (const slot of slots) {
      const key = dateKey(new Date(slot.slot_start))
      const list = map.get(key) || []
      list.push(slot)
      map.set(key, list)
    }
    return map
  }, [slots])

  const selectedSlots = selectedKey ? slotsByDate.get(selectedKey) || [] : []

  useEffect(() => {
    if (!user) return
    getMyAvailability(user.id)
      .then((data) => {
        setSlots(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error cargando tu disponibilidad')
        setLoading(false)
      })
  }, [user])

  const changeMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const isCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth()

  const handleAddSlot = async () => {
    if (!user || !selectedKey || !newTime) return
    const [y, m, d] = selectedKey.split('-').map(Number)
    const [hh, mm] = newTime.split(':').map(Number)
    const start = new Date(y, m - 1, d, hh, mm, 0, 0)

    if (start <= new Date()) {
      setError('No puedes agregar horarios en el pasado.')
      setSuccess('')
      return
    }

    setActionPending(true)
    setError('')
    setSuccess('')
    try {
      const created = await addSlot(user.id, start)
      setSlots((prev) =>
        [...prev, created].sort((a, b) => a.slot_start.localeCompare(b.slot_start))
      )
      setSuccess(`Horario agregado: ${formatSelectedDate(selectedKey)} a las ${formatTime(created.slot_start)}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar el horario')
    } finally {
      setActionPending(false)
    }
  }

  const handleDeleteSlot = async (slot: AvailabilitySlot) => {
    setActionPending(true)
    setError('')
    setSuccess('')
    try {
      await deleteSlot(slot.id)
      setSlots((prev) => prev.filter((s) => s.id !== slot.id))
      setSuccess('Horario eliminado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el horario')
    } finally {
      setActionPending(false)
      setConfirmDelete(null)
    }
  }

  // Construcción de la cuadrícula del mes (semana inicia en lunes).
  const monthDays: (Date | null)[] = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
    }
    return cells
  }, [viewMonth])

  const monthLabel = viewMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="section-calma">
        <div className="container-calma text-center py-16">
          <p className="text-text-light">Cargando tu disponibilidad...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Disponibilidad</h1>
          <p className="text-text-light">
            Elige un día en el calendario y agrega las horas en las que puedes atender.
            Los pacientes solo podrán agendar en los horarios que publiques aquí.
          </p>
        </div>

        {error && <Alert variant="error" className="mb-6 p-3 rounded-sm">{error}</Alert>}
        {success && (
          <Alert variant="success" className="mb-6" autoDismiss={5000} onDismiss={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Calendario mensual */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary" />
                  {monthLabel}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => changeMonth(-1)}
                    disabled={isCurrentMonth}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} aria-label="Mes siguiente">
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-light mb-2">
                {WEEKDAYS.map((d, i) => (
                  <div key={i} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />
                  const key = dateKey(date)
                  const isPast = date < today
                  const count = slotsByDate.get(key)?.length || 0
                  const isSelected = key === selectedKey
                  const isToday = key === dateKey(today)
                  return (
                    <button
                      key={key}
                      disabled={isPast}
                      aria-pressed={isSelected}
                      aria-label={`${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}${count > 0 ? `, ${count} horario(s)` : ''}${isToday ? ', hoy' : ''}`}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => {
                        setSelectedKey(key)
                        setError('')
                        setSuccess('')
                      }}
                      className={`relative aspect-square rounded-sm text-sm font-medium transition-colors flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-primary-dark text-white'
                          : isPast
                            ? 'text-text-light/40 cursor-not-allowed'
                            : count > 0
                              ? 'bg-primary/10 text-primary-dark hover:bg-primary/20'
                              : 'text-text hover:bg-bg-alt'
                      } ${isToday && !isSelected ? 'ring-1 ring-primary' : ''}`}
                    >
                      {date.getDate()}
                      {count > 0 && (
                        <span
                          className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-primary'
                          }`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-xs text-text-light flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                Días con horarios publicados
              </p>
            </CardContent>
          </Card>

          {/* Panel del día seleccionado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg capitalize">
                {selectedKey ? formatSelectedDate(selectedKey) : 'Selecciona un día'}
              </CardTitle>
              <CardDescription>
                {selectedKey
                  ? `Cada horario genera una sesión de ${SLOT_DURATION_MINUTES} minutos.`
                  : 'Haz clic en un día del calendario para ver y agregar horarios.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedKey && (
                <div className="space-y-4">
                  {selectedSlots.length === 0 ? (
                    <p className="text-sm text-text-light">Aún no tienes horarios este día.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-3 p-3 bg-bg-alt rounded-sm"
                        >
                          <Clock size={16} className="text-primary shrink-0" />
                          <span className="text-text font-medium flex-1">
                            {formatTime(slot.slot_start)} – {formatTime(slot.slot_end)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error-dark"
                            disabled={actionPending}
                            onClick={() => setConfirmDelete(slot)}
                            aria-label={`Eliminar horario de ${formatTime(slot.slot_start)}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 rounded-sm border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={handleAddSlot}
                      disabled={actionPending || !newTime}
                    >
                      <Plus size={16} />
                      Agregar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Eliminar horario"
        destructive
        loading={actionPending}
        message={
          confirmDelete
            ? `¿Eliminar el horario del ${new Date(confirmDelete.slot_start).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} de ${formatTime(confirmDelete.slot_start)} a ${formatTime(confirmDelete.slot_end)}? Si ya hay una cita agendada en ese horario, no se verá afectada.`
            : ''
        }
        confirmLabel="Sí, eliminar"
        onConfirm={() => confirmDelete && handleDeleteSlot(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
