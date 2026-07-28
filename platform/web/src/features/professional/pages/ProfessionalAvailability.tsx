import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock, Plus, Trash2, Save, Check } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getMyAvailability,
  saveMyAvailability,
  type AvailabilityRangeInput,
} from '@/features/availability/availabilityService'

// Orden de visualización: Lunes (1) ... Sábado (6), Domingo (0).
const days: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

type EditableRange = AvailabilityRangeInput & { key: string }

let nextKey = 0
function newKey() {
  nextKey += 1
  return `range-${nextKey}`
}

const inputClass =
  'px-3 py-2 rounded-[12px] border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function ProfessionalAvailability() {
  const { user } = useAuth()

  const [ranges, setRanges] = useState<EditableRange[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) return
    getMyAvailability(user.id)
      .then((data) => {
        setRanges(
          data.map((range) => ({
            key: newKey(),
            day_of_week: range.day_of_week,
            start_time: range.start_time,
            end_time: range.end_time,
          }))
        )
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error cargando tu disponibilidad')
        setLoading(false)
      })
  }, [user])

  const addRange = (dayOfWeek: number) => {
    setSuccess('')
    setRanges((prev) => [
      ...prev,
      { key: newKey(), day_of_week: dayOfWeek, start_time: '09:00', end_time: '10:00' },
    ])
  }

  const updateRange = (key: string, field: 'start_time' | 'end_time', value: string) => {
    setSuccess('')
    setRanges((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  const removeRange = (key: string) => {
    setSuccess('')
    setRanges((prev) => prev.filter((r) => r.key !== key))
  }

  const handleSave = async () => {
    if (!user) return

    const invalid = ranges.some((r) => r.start_time >= r.end_time)
    if (invalid) {
      setError('La hora de inicio debe ser menor que la hora de fin en todos los rangos.')
      setSuccess('')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await saveMyAvailability(
        user.id,
        ranges.map((r) => ({
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          end_time: r.end_time,
        }))
      )
      setSuccess('Tu disponibilidad se guardó correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la disponibilidad')
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Disponibilidad</h1>
            <p className="text-text-light">
              Configura tus horarios de atención. Los pacientes solo podrán agendar dentro de estos rangos.
            </p>
          </div>
          <Button className="mt-4 md:mt-0 gap-2" onClick={handleSave} disabled={saving}>
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-[12px] bg-error/10 text-error text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-6 p-3 rounded-[12px] bg-success/10 text-success text-sm flex items-center gap-2">
            <Check size={16} />
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map((day) => {
            const dayRanges = ranges.filter((r) => r.day_of_week === day.value)
            return (
              <Card key={day.value}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{day.label}</CardTitle>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => addRange(day.value)}>
                      <Plus size={16} />
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dayRanges.length === 0 ? (
                    <p className="text-sm text-text-light">Sin horarios configurados.</p>
                  ) : (
                    <div className="space-y-3">
                      {dayRanges.map((range) => {
                        const isInvalid = range.start_time >= range.end_time
                        return (
                          <div key={range.key} className="p-3 bg-bg-alt rounded-[12px] space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock size={16} className="text-text-light shrink-0" />
                              <input
                                type="time"
                                value={range.start_time}
                                onChange={(e) => updateRange(range.key, 'start_time', e.target.value)}
                                className={inputClass}
                              />
                              <span className="text-text-light">-</span>
                              <input
                                type="time"
                                value={range.end_time}
                                onChange={(e) => updateRange(range.key, 'end_time', e.target.value)}
                                className={inputClass}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-error ml-auto"
                                onClick={() => removeRange(range.key)}
                                aria-label="Eliminar rango"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                            {isInvalid && (
                              <p className="text-xs text-error">La hora de inicio debe ser menor que la de fin.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
