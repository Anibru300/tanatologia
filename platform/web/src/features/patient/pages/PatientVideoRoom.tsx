import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { PhoneOff } from 'lucide-react'
import { JitsiMeetingRoom } from '@/components/video/JitsiMeetingRoom'
import { getAppointmentById } from '@/features/appointments/mockAppointments'
import { useAuth } from '@/features/auth/AuthProvider'

export function PatientVideoRoom() {
  const { appointmentId } = useParams<{ appointmentId?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!appointmentId) {
    return (
      <div className="section-calma">
        <div className="container-calma">
          <h1 className="text-2xl font-bold text-text mb-2">Sala no encontrada</h1>
          <p className="text-text-light">No se proporcionó un ID de cita.</p>
        </div>
      </div>
    )
  }

  const appointment = getAppointmentById(appointmentId)

  if (!appointment) {
    return (
      <div className="section-calma">
        <div className="container-calma">
          <h1 className="text-2xl font-bold text-text mb-2">Sala no encontrada</h1>
          <p className="text-text-light">La cita solicitada no existe o no tienes acceso.</p>
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
              {appointment.professionalName} · {appointment.date} · {appointment.time} hrs
            </p>
          </div>
          <Button variant="outline" className="gap-2 self-start" onClick={() => navigate(-1)}>
            <PhoneOff size={18} /> Colgar
          </Button>
        </div>
        <div className="flex-1 min-h-[500px]">
          <JitsiMeetingRoom
            roomName={appointment.videoLink}
            displayName={user?.fullName || 'Paciente'}
            onReadyToClose={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  )
}
