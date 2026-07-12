import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Video, CalendarDays, CheckCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  updateAppointmentStatus,
  type Appointment,
} from '@/features/appointments/appointmentsService'

export function ProfessionalAppointments() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    try {
      await updateAppointmentStatus(id, status)
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error actualizando cita')
    }
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Mis citas</h1>
            <p className="text-text-light">Gestiona tu agenda de pacientes.</p>
          </div>
          <Button className="mt-4 md:mt-0 gap-2">
            <CalendarDays size={18} />
            Ver calendario
          </Button>
        </div>

        {loading && <p className="text-text-light mb-4">Cargando citas...</p>}
        {error && <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm mb-4">{error}</div>}
        {!loading && appointments.length === 0 && (
          <p className="text-text-light mb-4">No tienes citas registradas.</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Citas próximas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Paciente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text font-medium">{a.patientName}</td>
                      <td className="py-4 px-4 text-text">{formatDate(a.scheduled_at)}</td>
                      <td className="py-4 px-4 text-text-light">{formatTime(a.scheduled_at)}</td>
                      <td className="py-4 px-4 text-text-light">{a.serviceName}</td>
                      <td className="py-4 px-4">
                        <Badge variant={a.status === 'confirmed' ? 'success' : 'warning'}>
                          {a.status === 'confirmed' ? 'Confirmada' : a.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {a.video_link && (
                            <Link to={`/profesional/sala/${a.id}`}>
                              <Button size="sm" variant="primary" className="gap-1">
                                <Video size={16} />
                                Entrar
                              </Button>
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(a.id, 'completed')}
                          >
                            <CheckCircle size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-error"
                            onClick={() => handleStatusChange(a.id, 'cancelled')}
                          >
                            <XCircle size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
