import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { PhoneOff } from 'lucide-react'
const JitsiMeetingRoom = lazy(() =>
  import('@/components/video/JitsiMeetingRoom').then((m) => ({ default: m.JitsiMeetingRoom }))
)
import { getAppointmentById, type Appointment } from '@/features/appointments/appointmentsService'
import { useAuth } from '@/features/auth/AuthProvider'

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

  return (
    <div className="section-calma flex-1 flex flex-col min-h-[calc(100vh-80px)]">
      <div className="container-calma flex-1 flex flex-col">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Tu sesión</h1>
            <p className="text-text-light text-sm">
              {appointment.professionalName} · {new Date(appointment.scheduled_at).toLocaleString('es-MX')}
            </p>
          </div>
          <Button variant="outline" className="gap-2 self-start" onClick={() => navigate(-1)}>
            <PhoneOff size={18} /> Colgar
          </Button>
        </div>
        <div className="flex-1 min-h-[500px]">
          <Suspense fallback={<p className="text-text-light">Cargando videollamada...</p>}>
            <JitsiMeetingRoom
              roomName={appointment.video_link}
              displayName={user?.fullName || 'Paciente'}
              onReadyToClose={() => navigate(-1)}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
