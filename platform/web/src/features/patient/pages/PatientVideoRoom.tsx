import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CalendarClock } from 'lucide-react'
const VideoCallExperience = lazy(() =>
  import('@/components/video/VideoCallExperience').then((m) => ({ default: m.VideoCallExperience }))
)
import { getAppointmentById, type Appointment } from '@/features/appointments/appointmentsService'
import { useAuth } from '@/features/auth/useAuth'
import { EARLY_JOIN_MINUTES, formatTimeUntilStart, getJoinWindowState } from '@/lib/videoSession'

export function PatientVideoRoom() {
  const { appointmentId } = useParams<{ appointmentId?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!appointmentId) {
      setError('No se proporcionó un ID de cita.')
      setLoading(false)
      return
    }
    const appointmentIdRef = appointmentId

    let cancelled = false

    async function load() {
      try {
        const data = await getAppointmentById(appointmentIdRef)
        if (!cancelled) {
          if (data) {
            setAppointment(data)
          } else {
            setError('La cita solicitada no existe o no tienes acceso.')
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando la cita')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [appointmentId])

  if (loading) {
    return (
      <div className="section-calma">
        <div className="container-calma">
          <p className="text-text-light">Cargando sala...</p>
        </div>
      </div>
    )
  }

  if (error || !appointment || !appointment.video_link) {
    return (
      <div className="section-calma">
        <div className="container-calma">
          <h1 className="text-2xl font-bold text-text mb-2">Sala no disponible</h1>
          <p className="text-text-light">{error || 'Esta cita aún no tiene sala de videollamada.'}</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const window = getJoinWindowState(appointment, now)

  // La sesión terminó, fue cancelada o no se presentó.
  if (window === 'ended') {
    return (
      <div className="section-calma">
        <div className="container-calma">
          <h1 className="text-2xl font-bold text-text mb-2">Esta sesión ya no está disponible</h1>
          <p className="text-text-light mb-6">
            {appointment.status === 'cancelled'
              ? 'La cita fue cancelada. Si necesitas reagendar, puedes hacerlo desde tu panel.'
              : 'El horario de esta sesión ya pasó. Si tuviste algún problema, contáctanos.'}
          </p>
          <Button variant="outline" onClick={() => navigate('/paciente/citas')}>
            Volver a mis citas
          </Button>
        </div>
      </div>
    )
  }

  // Aún no es tiempo: la sala abre EARLY_JOIN_MINUTES antes de la cita.
  if (window === 'too_early') {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <CalendarClock size={28} className="text-primary-dark shrink-0" />
            <h1 className="text-2xl font-bold text-text">Tu sesión aún no comienza</h1>
          </div>
          <p className="text-text-light mb-2">
            Tu cita con {appointment.professionalName} es el{' '}
            <strong className="text-text">
              {new Date(appointment.scheduled_at).toLocaleString('es-MX')}
            </strong>{' '}
            ({formatTimeUntilStart(appointment, now)}).
          </p>
          <p className="text-text-light mb-6">
            La sala se abre {EARLY_JOIN_MINUTES} minutos antes. Vuelve entonces y aquí
            encontrarás el acceso.
          </p>
          <Button variant="outline" onClick={() => navigate('/paciente/citas')}>
            Volver a mis citas
          </Button>
        </div>
      </div>
    )
  }

  // Ventana activa: chequeo de dispositivos y sala a viewport completo.
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[60] bg-bg flex items-center justify-center">
          <p className="text-text-light">Cargando videollamada...</p>
        </div>
      }
    >
      <VideoCallExperience
        roomName={appointment.video_link}
        displayName={user?.fullName || 'Paciente'}
        title="Tu sesión"
        subtitle={`${appointment.professionalName} · ${new Date(appointment.scheduled_at).toLocaleString('es-MX')}`}
        preJoinTip="Busca un lugar tranquilo y privado. Tu profesional de la salud ya puede estar dentro de la sala."
        appointmentId={appointment.id}
        onExit={() => navigate('/paciente/citas')}
      />
    </Suspense>
  )
}
