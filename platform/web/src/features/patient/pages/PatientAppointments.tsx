import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Clock, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getPatientProfileId,
  getAppointmentsForPatient,
  type Appointment,
} from '@/features/appointments/appointmentsService'

export function PatientAppointments() {
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
        const patientProfileId = await getPatientProfileId(userId)
        if (!patientProfileId) {
          throw new Error('No se encontró tu perfil de paciente.')
        }
        const data = await getAppointmentsForPatient(patientProfileId)
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
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mis citas</h1>
          <p className="text-text-light">Gestiona tus sesiones programadas y tu historial.</p>
        </div>

        {loading && <p className="text-text-light">Cargando citas...</p>}
        {error && <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm mb-4">{error}</div>}
        {!loading && appointments.length === 0 && (
          <p className="text-text-light">No tienes citas registradas.</p>
        )}

        <div className="space-y-4">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text">{apt.professionalName}</h3>
                      <Badge variant={apt.status === 'confirmed' ? 'success' : 'info'}>
                        {apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'completed' ? 'Completada' : apt.status}
                      </Badge>
                    </div>
                    <p className="text-text-light text-sm mb-2">{apt.serviceName}</p>
                    <div className="flex items-center gap-4 text-sm text-text-light">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(apt.scheduled_at)}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {formatTime(apt.scheduled_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {apt.status === 'confirmed' && apt.video_link && (
                      <Link to={`/paciente/sala/${apt.id}`}>
                        <Button size="sm" className="gap-1">
                          <Video size={16} />
                          Entrar
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm">Detalles</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
