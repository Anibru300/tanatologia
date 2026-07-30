import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar, Clock, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getPatientProfileId,
  getAppointmentsForPatient,
  updateAppointmentStatus,
  type Appointment,
} from '@/features/appointments/appointmentsService'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'info',
  cancelled: 'error',
  no_show: 'error',
}

export function PatientAppointments() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null)
  const [acting, setActing] = useState(false)

  const handleCancel = async (apt: Appointment) => {
    try {
      setActing(true)
      setActionError('')
      await updateAppointmentStatus(apt.id, 'cancelled')
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? { ...a, status: 'cancelled' } : a)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cancelar la cita.')
    } finally {
      setActing(false)
      setConfirmCancel(null)
    }
  }

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
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {actionError && <Alert variant="error" className="mb-4">{actionError}</Alert>}
        {!loading && !error && appointments.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="No tienes citas registradas"
            description="Agenda tu primera sesión con un profesional verificado."
            actionLabel="Agendar mi primera cita"
            actionTo="/paciente/agendar"
          />
        )}

        <div className="space-y-4">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text">{apt.professionalName}</h3>
                      <Badge variant={STATUS_VARIANTS[apt.status] || 'default'}>
                        {STATUS_LABELS[apt.status] || apt.status}
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
                    <Button
                      variant="outline"
                      size="sm"
                      aria-expanded={expandedId === apt.id}
                      onClick={() => setExpandedId(expandedId === apt.id ? null : apt.id)}
                    >
                      {expandedId === apt.id ? 'Ocultar' : 'Detalles'}
                    </Button>
                    {apt.status === 'confirmed' && new Date(apt.scheduled_at) > new Date() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error-dark"
                        disabled={acting}
                        onClick={() => setConfirmCancel(apt)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
                {expandedId === apt.id && (
                  <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-text-light">Tipo de sesión</p>
                      <p className="text-text font-medium">
                        {apt.session_type === 'single' ? 'Consulta aislada' : apt.session_type === 'program_4' ? 'Programa de 4 sesiones' : 'Programa de 6 sesiones'}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-light">Duración</p>
                      <p className="text-text font-medium">{apt.duration_minutes} minutos</p>
                    </div>
                    <div>
                      <p className="text-text-light">Modalidad</p>
                      <p className="text-text font-medium">{apt.video_link ? 'Videollamada' : 'Por confirmar'}</p>
                    </div>
                    <div>
                      <p className="text-text-light">Agendada el</p>
                      <p className="text-text font-medium">{formatDate(apt.created_at)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <ConfirmDialog
          open={confirmCancel !== null}
          title="Cancelar cita"
          destructive
          loading={acting}
          message={
            confirmCancel
              ? `¿Cancelar tu cita con ${confirmCancel.professionalName} del ${formatDate(confirmCancel.scheduled_at)} a las ${formatTime(confirmCancel.scheduled_at)} hrs? Recuerda que cancelar con menos de 24 horas puede considerarse sesión utilizada.`
              : ''
          }
          confirmLabel="Sí, cancelar cita"
          onConfirm={() => confirmCancel && handleCancel(confirmCancel)}
          onCancel={() => setConfirmCancel(null)}
        />
      </div>
    </div>
  )
}
