import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Select'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { CalendarClock } from 'lucide-react'
import {
  getAdminProfessionals,
  getAdminSlots,
  type AdminProfessional,
  type AdminSlot,
} from '@/features/admin/adminService'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  verified: 'Verificado',
  rejected: 'Rechazado',
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  pending: 'default',
  in_review: 'warning',
  verified: 'success',
  rejected: 'error',
}

type Row = {
  professional: AdminProfessional
  slots: AdminSlot[] // futuros, ordenados asc
}

const MAX_SLOTS_SHOWN = 6

function formatSlot(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
}

export function AdminAvailability() {
  const [professionals, setProfessionals] = useState<AdminProfessional[]>([])
  const [slots, setSlots] = useState<AdminSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [profs, allSlots] = await Promise.all([getAdminProfessionals(), getAdminSlots()])
      setProfessionals(profs)
      setSlots(allSlots)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la disponibilidad')
    } finally {
      setLoading(false)
    }
  }

  const slotsByProfessional = useMemo(() => {
    const map = new Map<string, AdminSlot[]>()
    for (const slot of slots) {
      const list = map.get(slot.professional_profile_id) || []
      list.push(slot)
      map.set(slot.professional_profile_id, list)
    }
    return map
  }, [slots])

  const rows = useMemo<Row[]>(() => {
    const filtered = filter === 'all' ? professionals : professionals.filter((p) => p.id === filter)
    return filtered
      .map((professional) => ({
        professional,
        slots: slotsByProfessional.get(professional.id) || [],
      }))
      .sort((a, b) => {
        // Con horarios primero (por próximo slot); sin horarios al final
        const aNext = a.slots[0] ? new Date(a.slots[0].slot_start).getTime() : Number.POSITIVE_INFINITY
        const bNext = b.slots[0] ? new Date(b.slots[0].slot_start).getTime() : Number.POSITIVE_INFINITY
        return aNext - bNext
      })
  }, [professionals, slotsByProfessional, filter])

  const withSlots = professionals.filter((p) => (slotsByProfessional.get(p.id) || []).length > 0).length
  const freeSlots = slots.filter((s) => !s.booked).length

  const filterOptions = [
    { value: 'all', label: 'Todos los profesionales' },
    ...professionals.map((p) => ({ value: p.id, label: p.full_name })),
  ]

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Disponibilidad</h1>
          <p className="text-text-light">
            Horarios que cada profesionista ha publicado para que los pacientes agenden.
          </p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-text">{professionals.length}</p>
              <p className="text-sm text-text-light">Profesionistas registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-text">{withSlots}</p>
              <p className="text-sm text-text-light">Con horarios publicados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-text">{slots.length}</p>
              <p className="text-sm text-text-light">Horarios futuros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-success-dark">{freeSlots}</p>
              <p className="text-sm text-text-light">Libres para agendar</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="max-w-md">
              <Select
                label="Filtrar por profesionista"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                options={filterOptions}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock size={20} className="text-primary" />
              Horarios publicados
            </CardTitle>
            <CardDescription>
              Solo horarios futuros. "Libre" = un paciente puede agendarlo; "Ocupado" = ya tiene cita.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonCards count={2} />
            ) : (
              <DataTable
                rows={rows}
                keyOf={(r) => r.professional.id}
                emptyMessage="No hay profesionistas registrados."
                caption="Horarios futuros publicados por profesionista"
                columns={[
                  {
                    header: 'Profesional',
                    render: (r) => (
                      <div>
                        <p className="text-text font-medium">{r.professional.full_name}</p>
                        <p className="text-text-light text-sm">{r.professional.email}</p>
                      </div>
                    ),
                  },
                  {
                    header: 'Verificación',
                    render: (r) => (
                      <Badge variant={STATUS_VARIANTS[r.professional.verification_status] || 'default'}>
                        {STATUS_LABELS[r.professional.verification_status] || r.professional.verification_status}
                      </Badge>
                    ),
                  },
                  {
                    header: 'Visible',
                    render: (r) => (
                      <Badge variant={r.professional.is_visible ? 'success' : 'default'}>
                        {r.professional.is_visible ? 'Sí' : 'No'}
                      </Badge>
                    ),
                  },
                  {
                    header: 'Total',
                    render: (r) => (
                      <span className="text-text-light">
                        {r.slots.length > 0 ? `${r.slots.length} horario${r.slots.length === 1 ? '' : 's'}` : '—'}
                      </span>
                    ),
                  },
                  {
                    header: 'Próximo',
                    render: (r) =>
                      r.slots[0] ? (
                        <span className="text-text-light">{formatSlot(r.slots[0].slot_start)}</span>
                      ) : (
                        <span className="text-muted">Sin horarios</span>
                      ),
                  },
                  {
                    header: 'Horarios (próximos)',
                    render: (r) =>
                      r.slots.length === 0 ? (
                        <span className="text-muted text-sm">No ha publicado horarios futuros.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {r.slots.slice(0, MAX_SLOTS_SHOWN).map((s) => (
                            <Badge key={s.id} variant={s.booked ? 'default' : 'success'}>
                              {formatSlot(s.slot_start)} · {s.booked ? 'Ocupado' : 'Libre'}
                            </Badge>
                          ))}
                          {r.slots.length > MAX_SLOTS_SHOWN && (
                            <Badge variant="default">+{r.slots.length - MAX_SLOTS_SHOWN} más</Badge>
                          )}
                        </div>
                      ),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
