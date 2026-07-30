import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Video, PhoneOff, ChevronDown, ChevronUp } from 'lucide-react'
const JitsiMeetingRoom = lazy(() =>
  import('@/components/video/JitsiMeetingRoom').then((m) => ({ default: m.JitsiMeetingRoom }))
)
import {
  getAppointmentById,
  getAppointmentsForProfessional,
  getProfessionalProfileId,
  type Appointment,
} from '@/features/appointments/appointmentsService'
import { useAuth } from '@/features/auth/AuthProvider'

export function ProfessionalVideoRoom() {
  const { appointmentId } = useParams<{ appointmentId?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loadingAppointment, setLoadingAppointment] = useState(true)

  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(false)

  const [manualRoom, setManualRoom] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [activeRoom, setActiveRoom] = useState<string | null>(null)

  // Cargar la cita cuando se entra con /profesional/sala/:appointmentId
  useEffect(() => {
    if (!appointmentId) {
      setLoadingAppointment(false)
      return
    }
    const appointmentIdRef = appointmentId

    let cancelled = false

    async function load() {
      try {
        const data = await getAppointmentById(appointmentIdRef)
        if (!cancelled) setAppointment(data)
      } catch (err) {
        console.error('Error cargando cita:', err)
      } finally {
        if (!cancelled) setLoadingAppointment(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [appointmentId])

  // Sin appointmentId: cargar las próximas citas para unirse con un clic.
  useEffect(() => {
    if (appointmentId || !user) return

    let cancelled = false
    setLoadingUpcoming(true)

    async function load() {
      try {
        const professionalProfileId = await getProfessionalProfileId(user!.id)
        if (!professionalProfileId) return
        const appointments = await getAppointmentsForProfessional(professionalProfileId)
        const now = new Date()
        const next = appointments
          .filter(
            (a) =>
              (a.status === 'pending' || a.status === 'confirmed') &&
              new Date(a.scheduled_at).getTime() > now.getTime() - 30 * 60 * 1000
          )
          .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
          .slice(0, 5)
        if (!cancelled) setUpcoming(next)
      } catch (err) {
        console.error('Error cargando próximas citas:', err)
      } finally {
        if (!cancelled) setLoadingUpcoming(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [appointmentId, user])

  const handleEnterManual = () => {
    const trimmed = manualRoom.trim()
    if (trimmed) {
      // El texto capturado ES el nombre de la sala (video_link), no una semilla
      setActiveRoom(trimmed)
    }
  }

  const roomName = activeRoom || appointment?.video_link

  // Sala activa: ocupa todo el viewport (overlay sobre el layout del portal).
  if (roomName) {
    return (
      <div className="fixed inset-0 z-[60] bg-bg flex flex-col">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-border bg-surface shrink-0">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-text truncate">Sesión en curso</h1>
            {appointment ? (
              <p className="text-text-light text-xs sm:text-sm truncate">
                {appointment.patientName} · {new Date(appointment.scheduled_at).toLocaleString('es-MX')}
              </p>
            ) : (
              <p className="text-text-light text-xs sm:text-sm truncate">Sala manual</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => navigate(-1)}>
            <PhoneOff size={16} /> Colgar
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <Suspense fallback={<p className="text-text-light p-6">Cargando videollamada...</p>}>
            <JitsiMeetingRoom
              roomName={roomName}
              displayName={user?.fullName || 'Profesional'}
              onReadyToClose={() => navigate(-1)}
            />
          </Suspense>
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Sala de videollamada</h1>
          <p className="text-text-light">Inicia o únete a una sesión con tu paciente.</p>
        </div>

        {loadingAppointment ? (
          <p className="text-text-light">Cargando...</p>
        ) : appointment && !appointment.video_link ? (
          <p className="text-text-light mb-6">Esta cita aún no tiene sala asignada.</p>
        ) : null}

        {/* Próximas citas: entrada directa sin conocer el ID de sala */}
        <Card className="mb-6 max-w-2xl">
          <CardHeader>
            <CardTitle>Tus próximas sesiones</CardTitle>
            <CardDescription>Entra directamente a la sala de cualquiera de tus citas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingUpcoming && <p className="text-text-light text-sm">Cargando citas...</p>}
            {!loadingUpcoming && upcoming.length === 0 && (
              <p className="text-text-light text-sm">No tienes citas próximas programadas.</p>
            )}
            {!loadingUpcoming &&
              upcoming.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-3 p-3 bg-bg-alt rounded-[12px]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-medium truncate">{appt.patientName}</p>
                    <p className="text-text-light text-sm">
                      {new Date(appt.scheduled_at).toLocaleString('es-MX')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => navigate(`/profesional/sala/${appt.id}`)}
                  >
                    <Video size={16} />
                    Entrar
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Acceso manual: opción secundaria para soporte/casos especiales */}
        <Card className="max-w-2xl">
          <CardContent className="p-4">
            <button
              onClick={() => setShowManual((v) => !v)}
              className="flex items-center gap-2 text-sm text-text-light hover:text-text w-full"
            >
              {showManual ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Unirse manualmente con nombre de sala
            </button>
            {showManual && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <input
                  type="text"
                  value={manualRoom}
                  onChange={(e) => setManualRoom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnterManual()}
                  placeholder="Nombre de la sala"
                  className="flex-1 px-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button className="gap-2" onClick={handleEnterManual}>
                  <Video size={18} />
                  Entrar a la sala
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
