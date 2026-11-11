import { useCallback, useEffect, useState } from 'react'
import { PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DeviceCheck } from './DeviceCheck'
import { JitsiMeetingRoom } from './JitsiMeetingRoom'
import { fetchJaasToken, type JaasResult, type JaasToken } from '@/lib/jaasService'
import { REJOIN_GRACE_MINUTES } from '@/lib/videoSession'
import { supabase } from '@/lib/supabase'

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
  /**
   * Para salas de prueba (panel admin): función que obtiene el token JaaS
   * sin cita. Si se omite, se usa fetchJaasToken(appointmentId). Debe ser
   * estable (useCallback) para no disparar refetch en cada render.
   */
  fetchToken?: (roomName: string) => Promise<JaasResult>
  /** A dónde volver al colgar (normalmente navigate a la lista de citas). */
  onExit: () => void
  /** Se dispara al colgar DESPUÉS de haber entrado a la sala (no en el prejoin).
   *  El consumidor decide qué hacer (p. ej. marcar la cita como completada). */
  onHangup?: () => void
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
  fetchToken,
  onExit,
  onHangup,
}: VideoCallExperienceProps) {
  const [joined, setJoined] = useState(false)
  const [videoMuted, setVideoMuted] = useState(false)
  const [jaas, setJaas] = useState<JaasToken | null>(null)
  /** Motivo por el que no hay token JaaS (fallback a meet.jit.si de 5 min). */
  const [jaasWarning, setJaasWarning] = useState<string | null>(null)
  /** Confirmación antes de colgar (solo profesionales, que cierran la cita). */
  const [confirmHangup, setConfirmHangup] = useState(false)

  // Diagnósticos de videollamada: eventos de audio/ingreso del propio cliente
  // persistidos en video_call_events (migración 038) para rastrear después
  // problemas como "la paciente no escuchaba" (p. ej. quién tenía el micrófono
  // silenciado y cuándo). Best-effort: jamás rompe la llamada.
  const handleDiagnostic = useCallback(
    (eventType: string, detail?: Record<string, unknown>) => {
      if (!appointmentId) return
      void supabase
        .rpc('log_video_diagnostic', {
          p_appointment_id: appointmentId,
          p_event_type: eventType,
          p_detail: detail ?? null,
        })
        .then(({ error }) => {
          if (error) console.error('[videollamada] diagnóstico:', error.message)
        })
    },
    [appointmentId],
  )

  useEffect(() => {
    if (!appointmentId && !fetchToken) return
    let cancelled = false
    let attempts = 0

    async function tryFetch() {
      attempts++
      const { token, reason } = fetchToken
        ? await fetchToken(roomName)
        : await fetchJaasToken(appointmentId!)
      if (cancelled) return
      if (token) {
        setJaas(token)
        setJaasWarning(null)
      } else if (attempts < 2) {
        // Un reintento cubre cold-start o un fallo de red transitorio.
        setTimeout(tryFetch, 2000)
      } else {
        // Fallback a meet.jit.si (límite de 5 min): visible, no silencioso.
        console.error(`[videollamada] sin token JaaS: ${reason}`)
        setJaasWarning(
          'No pudimos activar la sala principal de videollamada, así que usarás la sala de ' +
            'respaldo (máximo 5 minutos). Recarga la página con Ctrl+F5 e inténtalo de nuevo; ' +
            `si el problema continúa, contacta a soporte. Motivo: ${reason}.`,
        )
      }
    }

    tryFetch()
    return () => {
      cancelled = true
    }
  }, [appointmentId, fetchToken, roomName])

  const handleExit = () => {
    // Colgar cierra la cita (onHangup, solo del lado profesional): pedir
    // confirmación primero. Colgar por error o para reintentar el audio es
    // común; la prórroga de reingreso (REJOIN_GRACE_MINUTES) lo hace reversible.
    if (joined && onHangup) {
      setConfirmHangup(true)
      return
    }
    onExit()
  }

  const confirmExit = () => {
    setConfirmHangup(false)
    if (joined) onHangup?.()
    onExit()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-border bg-surface shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-text truncate">{title}</h1>
          <p className="text-text-light text-xs sm:text-sm truncate">{subtitle}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExit}>
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
            onReadyToClose={handleExit}
            onDiagnostic={handleDiagnostic}
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
              {jaasWarning && (
                <Alert variant="warning" className="text-left">
                  {jaasWarning}
                </Alert>
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

      <ConfirmDialog
        open={confirmHangup}
        title="¿Finalizar la sesión?"
        message={
          <span>
            Al colgar, la cita se marcará como completada. Aun así, tú y tu paciente
            podrán reingresar a la sala durante los {REJOIN_GRACE_MINUTES} minutos
            siguientes a la hora de término de la sesión por si necesitan retomarla;
            después ya no será posible.
          </span>
        }
        confirmLabel="Finalizar sesión"
        cancelLabel="Seguir en la llamada"
        destructive
        onConfirm={confirmExit}
        onCancel={() => setConfirmHangup(false)}
      />
    </div>
  )
}
