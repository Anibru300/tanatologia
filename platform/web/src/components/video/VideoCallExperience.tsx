import { useEffect, useState } from 'react'
import { PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DeviceCheck } from './DeviceCheck'
import { JitsiMeetingRoom } from './JitsiMeetingRoom'
import { fetchJaasToken, type JaasToken } from '@/lib/jaasService'

interface VideoCallExperienceProps {
  roomName: string
  displayName: string
  /** Título del encabezado, p. ej. "Tu sesión" o "Sesión en curso". */
  title: string
  /** Subtítulo con profesional/paciente y fecha. */
  subtitle: string
  /** Consejo contextual mostrado durante el chequeo de dispositivos. */
  preJoinTip?: string
  /** ID de la cita: permite firmar un JWT de JaaS (8x8.vc). Sin JaaS
   *  configurado, la sala usa meet.jit.si gratuito automáticamente. */
  appointmentId?: string
  /** A dónde volver al colgar (normalmente navigate a la lista de citas). */
  onExit: () => void
}

/**
 * Experiencia completa de videollamada a viewport completo:
 * 1. Chequeo de cámara/micrófono con instrucciones en español.
 * 2. Sala Jitsi integrada.
 * 3. Salida controlada hacia la lista de citas.
 */
export function VideoCallExperience({
  roomName,
  displayName,
  title,
  subtitle,
  preJoinTip,
  appointmentId,
  onExit,
}: VideoCallExperienceProps) {
  const [joined, setJoined] = useState(false)
  const [videoMuted, setVideoMuted] = useState(false)
  const [jaas, setJaas] = useState<JaasToken | null>(null)

  useEffect(() => {
    if (!appointmentId) return
    let cancelled = false
    fetchJaasToken(appointmentId).then((token) => {
      if (!cancelled) setJaas(token)
    })
    return () => {
      cancelled = true
    }
  }, [appointmentId])

  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-border bg-surface shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-text truncate">{title}</h1>
          <p className="text-text-light text-xs sm:text-sm truncate">{subtitle}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={onExit}>
          <PhoneOff size={16} /> {joined ? 'Colgar' : 'Salir'}
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {joined ? (
          <JitsiMeetingRoom
            roomName={roomName}
            displayName={displayName}
            startWithVideoMuted={videoMuted}
            jaas={jaas ?? undefined}
            onReadyToClose={onExit}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="max-w-xl mx-auto p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-text mb-1">Antes de entrar</h2>
                <p className="text-text-light text-sm">
                  Vamos a comprobar que tu cámara y micrófono funcionen para que la sesión
                  empiece sin contratiempos.
                </p>
              </div>
              {preJoinTip && (
                <p className="text-sm text-secondary-dark bg-secondary/10 p-3 rounded-sm">
                  {preJoinTip}
                </p>
              )}
              <DeviceCheck
                onContinue={({ startWithVideoMuted }) => {
                  setVideoMuted(startWithVideoMuted)
                  setJoined(true)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
