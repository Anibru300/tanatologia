import { useCallback, useEffect, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

type CheckState = 'checking' | 'done' | 'unsupported'

interface DeviceStatus {
  camera: boolean
  mic: boolean
  denied: boolean
  /** Resolución y nombre de la cámara que negoció el navegador (diagnóstico). */
  cameraInfo?: string
}

interface DeviceCheckProps {
  /** Se llama cuando el usuario decide entrar (con o sin cámara). */
  onContinue: (opts: { startWithVideoMuted: boolean }) => void
}

/**
 * Verificación previa a la videollamada: pide permisos de cámara y micrófono,
 * libera los dispositivos de inmediato (para que Jitsi los tome después) y
 * muestra instrucciones claras si el navegador los bloqueó.
 */
export function DeviceCheck({ onContinue }: DeviceCheckProps) {
  const [state, setState] = useState<CheckState>('checking')
  const [status, setStatus] = useState<DeviceStatus>({ camera: false, mic: false, denied: false })

  const runCheck = useCallback(async () => {
    setState('checking')
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return
    }

    let camera = false
    let mic = false
    let denied = false
    let cameraInfo: string | undefined

    try {
      // Pedimos el máximo (1080p) para diagnosticar qué negocia realmente el
      // navegador: si aquí aparece 640×480 o una cámara distinta a la esperada
      // (p. ej. cámara IR/virtual), ahí está la causa de la imagen pixelada.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      camera = stream.getVideoTracks().length > 0
      mic = stream.getAudioTracks().length > 0
      const track = stream.getVideoTracks()[0]
      if (track) {
        const s = track.getSettings()
        const dims = s.width && s.height ? `${s.width}×${s.height}` : 'resolución desconocida'
        cameraInfo = `${dims}${track.label ? ` · ${track.label}` : ''}`
      }
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      denied = name === 'NotAllowedError' || name === 'SecurityError'

      // Reintento solo con micrófono: la cámara puede estar ocupada o ausente.
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true })
        mic = audioOnly.getAudioTracks().length > 0
        audioOnly.getTracks().forEach((t) => t.stop())
      } catch (audioErr) {
        const audioName = audioErr instanceof DOMException ? audioErr.name : ''
        denied = denied || audioName === 'NotAllowedError' || audioName === 'SecurityError'
      }
    }

    setStatus({ camera, mic, denied, cameraInfo })
    setState('done')
  }, [])

  useEffect(() => {
    runCheck()
  }, [runCheck])

  if (state === 'checking') {
    return <p className="text-text-light text-sm">Revisando tu cámara y micrófono…</p>
  }

  if (state === 'unsupported') {
    return (
      <Alert variant="warning">
        Tu navegador no permite acceder a cámara y micrófono. Usa la versión más reciente de
        Chrome, Edge, Firefox o Safari, e ingresa desde una conexión segura (https).
      </Alert>
    )
  }

  const nothingWorks = !status.camera && !status.mic

  return (
    <div className="space-y-4">
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          {status.camera ? (
            <Video size={16} className="text-success-dark shrink-0" />
          ) : (
            <VideoOff size={16} className="text-warning-dark shrink-0" />
          )}
          <span className="text-text">
            Cámara: {status.camera ? 'lista' : 'no disponible'}
            {status.camera && status.cameraInfo && (
              <span className="block text-text-light text-xs mt-0.5">{status.cameraInfo}</span>
            )}
          </span>
        </li>
        <li className="flex items-center gap-2">
          {status.mic ? (
            <Mic size={16} className="text-success-dark shrink-0" />
          ) : (
            <MicOff size={16} className="text-warning-dark shrink-0" />
          )}
          <span className="text-text">
            Micrófono: {status.mic ? 'listo' : 'no disponible'}
          </span>
        </li>
      </ul>

      {status.denied && (
        <Alert variant="warning">
          El navegador bloqueó el acceso. Haz clic en el ícono de candado o cámara junto a la
          barra de direcciones, permite cámara y micrófono para este sitio y presiona «Reintentar».
        </Alert>
      )}
      {!status.denied && nothingWorks && (
        <Alert variant="warning">
          No se encontró cámara ni micrófono. Revisa que no estén siendo usados por otra
          aplicación (Zoom, Meet, Teams) y presiona «Reintentar».
        </Alert>
      )}
      {!status.camera && status.mic && (
        <Alert variant="info">
          No detectamos tu cámara, pero tu micrófono funciona. Puedes entrar solo con audio.
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {!nothingWorks && (
          <Button
            className="gap-2"
            onClick={() => onContinue({ startWithVideoMuted: !status.camera })}
          >
            <Video size={18} />
            Entrar a la videollamada
          </Button>
        )}
        <Button variant="outline" className="gap-2" onClick={runCheck}>
          <RefreshCw size={16} />
          Reintentar
        </Button>
      </div>
    </div>
  )
}
