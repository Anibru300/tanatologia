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

  // La sala ocupa todo el viewport (overlay sobre el layout del portal).
  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-border bg-surface shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-text truncate">Tu sesión</h1>
          <p className="text-text-light text-xs sm:text-sm truncate">
            {appointment.professionalName} · {new Date(appointment.scheduled_at).toLocaleString('es-MX')}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => navigate('/paciente/citas')}>
          <PhoneOff size={16} /> Colgar
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<p className="text-text-light p-6">Cargando videollamada...</p>}>
          <JitsiMeetingRoom
            roomName={appointment.video_link}
            displayName={user?.fullName || 'Paciente'}
            onReadyToClose={() => navigate('/paciente/citas')}
          />
        </Suspense>
      </div>
    </div>
  )
}
