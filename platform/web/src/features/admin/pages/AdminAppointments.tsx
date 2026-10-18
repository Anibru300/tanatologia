import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Calendar, Video } from 'lucide-react'
import { getAdminAppointments, getCallFacts, type AdminAppointment, type AdminCallFact } from '@/features/admin/adminService'

const sessionTypeLabels: Record<string, string> = {
  single: 'Consulta aislada',
  program_4: 'Programa 4 sesiones',
  program_6: 'Programa 6 sesiones',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No show',
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
}

export function AdminAppointments() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [callFacts, setCallFacts] = useState<Map<string, AdminCallFact>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getAdminAppointments()
      setAppointments(data)
      setCallFacts(await getCallFacts(data.map((a) => a.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Citas</h1>
          <p className="text-text-light">Supervisión de todas las sesiones agendadas.</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Citas programadas
            </CardTitle>
            <CardDescription>Todas las citas de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              loading={loading}
              rows={appointments}
              keyOf={(a) => a.id}
              emptyMessage="No hay citas registradas."
              caption="Todas las citas de la plataforma"
              columns={[
                { header: 'Paciente', render: (a) => <span className="text-text">{a.patient_name}</span> },
                { header: 'Profesional', render: (a) => <span className="text-text">{a.professional_name}</span> },
                {
                  header: 'Fecha y hora',
                  render: (a) => {
                    const date = new Date(a.scheduled_at)
                    return (
                      <span className="text-text-light">
                        {date.toLocaleDateString('es-MX')}{' '}
                        {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )
                  },
                },
                {
                  header: 'Tipo',
                  render: (a) => <span className="text-text-light">{sessionTypeLabels[a.session_type] || a.session_type}</span>,
                },
                {
                  header: 'Videollamada',
                  render: (a) => {
                    const fact = callFacts.get(a.id)
                    if (!fact) {
                      return (
                        <span className="text-text-light text-xs inline-flex items-center gap-1">
                          <Video size={14} /> Sin datos
                        </span>
                      )
                    }
                    const label = `${fact.participants} participante${fact.participants === 1 ? '' : 's'}` +
                      (fact.duration_minutes != null && fact.duration_minutes > 0
                        ? ` · ${fact.duration_minutes} min`
                        : '')
                    if (fact.participants >= 2 && fact.duration_minutes != null && fact.duration_minutes > 0) {
                      return <Badge variant="success">{label}</Badge>
                    }
                    if (fact.room_destroyed) {
                      return <Badge variant="warning">{label} · no se conectaron</Badge>
                    }
                    return <Badge variant="info">{label} · sin cerrar</Badge>
                  },
                },
                {
                  header: 'Estado',
                  render: (a) => (
                    <Badge variant={statusVariants[a.status] || 'default'}>
                      {statusLabels[a.status] || a.status}
                    </Badge>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
