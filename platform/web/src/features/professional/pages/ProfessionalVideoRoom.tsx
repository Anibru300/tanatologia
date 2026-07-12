import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Video, PhoneOff } from 'lucide-react'
import { JitsiMeetingRoom } from '@/components/video/JitsiMeetingRoom'
import { getAppointmentById } from '@/features/appointments/mockAppointments'
import { useAuth } from '@/features/auth/AuthProvider'
import { generateJitsiRoomName } from '@/lib/video'

export function ProfessionalVideoRoom() {
  const { appointmentId } = useParams<{ appointmentId?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [manualRoom, setManualRoom] = useState('')
  const [activeRoom, setActiveRoom] = useState<string | null>(null)

  const appointment = appointmentId ? getAppointmentById(appointmentId) : undefined

  const handleEnterManual = () => {
    const trimmed = manualRoom.trim()
    if (trimmed) {
      setActiveRoom(generateJitsiRoomName(trimmed))
    }
  }

  // Si llegamos desde una cita, usamos su sala; si no, esperamos entrada manual.
  const roomName = activeRoom || appointment?.videoLink

  if (roomName) {
    return (
      <div className="section-calma flex-1 flex flex-col min-h-[calc(100vh-80px)]">
        <div className="container-calma flex-1 flex flex-col">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text">Sesión en curso</h1>
              {appointment ? (
                <p className="text-text-light text-sm">
                  {appointment.patientName} · {appointment.date} · {appointment.time} hrs
                </p>
              ) : (
                <p className="text-text-light text-sm">Sala manual</p>
              )}
            </div>
            <Button variant="outline" className="gap-2 self-start" onClick={() => navigate(-1)}>
              <PhoneOff size={18} /> Colgar
            </Button>
          </div>
          <div className="flex-1 min-h-[500px]">
            <JitsiMeetingRoom
              roomName={roomName}
              displayName={user?.fullName || 'Profesional'}
              onReadyToClose={() => navigate(-1)}
            />
          </div>
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

        <Card className="mb-6 max-w-2xl">
          <CardHeader>
            <CardTitle>Unirse a sesión</CardTitle>
            <CardDescription>
              Normalmente entrarás desde una cita. Si necesitas unirte manualmente, escribe un ID de sala.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={manualRoom}
              onChange={(e) => setManualRoom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnterManual()}
              placeholder="ID de la sala"
              className="flex-1 px-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button className="gap-2" onClick={handleEnterManual}>
              <Video size={18} />
              Entrar a la sala
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
