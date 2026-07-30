import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Calendar, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import {
  getPatientProfileId,
  getAppointmentsForPatient,
  type Appointment,
} from '@/features/appointments/appointmentsService'

export function PatientHistory() {
  const { user } = useAuth()
  const [completed, setCompleted] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        const patientProfileId = await getPatientProfileId(userId)
        if (!patientProfileId) throw new Error('No se encontró tu perfil de paciente.')
        const appointments = await getAppointmentsForPatient(patientProfileId)
        const done = appointments
          .filter((a) => a.status === 'completed')
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
        if (!cancelled) setCompleted(done)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar tu historial.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Historial de sesiones</h1>
          <p className="text-text-light">Registro de tus sesiones completadas.</p>
        </div>

        {error && <Alert variant="error" className="mb-4 p-3 rounded-sm">{error}</Alert>}
        {loading ? (
          <p className="text-text-light">Cargando historial...</p>
        ) : error ? null : completed.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText size={48} className="mx-auto mb-4 text-muted" />
              <p className="text-text-light mb-4">Aún no tienes sesiones completadas.</p>
              <Link to="/paciente/agendar">
                <Button size="sm">Agendar tu primera cita</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="relative border-l-2 border-border ml-4 space-y-8">
            {completed.map((session) => (
              <div key={session.id} className="relative pl-8">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-text">{session.professionalName}</h3>
                    <p className="text-text-light text-sm">{session.serviceName}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-text-light">
                      <Calendar size={14} />
                      {new Date(session.scheduled_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {' · '}
                      {new Date(session.scheduled_at).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                      {' hrs'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
