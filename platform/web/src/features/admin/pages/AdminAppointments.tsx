import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar } from 'lucide-react'
import { getAdminAppointments, type AdminAppointment } from '@/features/admin/adminService'

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

        {error && <div className="mb-4 p-3 rounded-[12px] bg-error/10 text-error text-sm">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Citas programadas
            </CardTitle>
            <CardDescription>Todas las citas de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-text-light">Cargando...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Paciente</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Profesional</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha y hora</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Tipo</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => {
                      const date = new Date(a.scheduled_at)
                      return (
                        <tr key={a.id} className="border-b border-border last:border-0">
                          <td className="py-4 px-4 text-text">{a.patient_name}</td>
                          <td className="py-4 px-4 text-text">{a.professional_name}</td>
                          <td className="py-4 px-4 text-text-light">
                            {date.toLocaleDateString('es-MX')} {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-4 text-text-light">{a.session_type}</td>
                          <td className="py-4 px-4">
                            <Badge variant={statusVariants[a.status] || 'default'}>
                              {statusLabels[a.status] || a.status}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
