import { useEffect, useRef, useState } from 'react'
import { JitsiMeeting, JaaSMeeting } from '@jitsi/react-sdk'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getJitsiDomain, getJitsiRoomUrl } from '@/lib/video'

/** Tiempo máximo de espera (ms) antes de mostrar el error de conexión. */
const LOAD_TIMEOUT_MS = 40_000

/**
 * Subconjunto de la API externa de Jitsi que usamos.
 * El SDK no exporta sus tipos públicamente, así que declaramos la forma mínima.
 */
type JitsiExternalApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addListener: (event: string, listener: (...args: any[]) => void) => unknown
}

interface JitsiMeetingRoomProps {
  roomName: string
  displayName: string
  email?: string
  /** Entrar con la cámara apagada (p. ej. si el chequeo previo no la encontró). */
  startWithVideoMuted?: boolean
  /**
   * Token JaaS (8x8.vc) para la sala. Cuando se omite, se usa meet.jit.si
   * gratuito (limitado a 5 min embebido). Se obtiene con fetchJaasToken().
   */
  jaas?: { jwt: string; appId: string; domain: string }
  onReadyToClose?: () => void
}

type LoadState = 'loading' | 'ready' | 'failed'

/**
 * Envoltorio de la sala Jitsi con la configuración de SOMOS-CALMA:
 * - Español, sin pantalla de bienvenida ni de pre-ingreso (usamos nuestro
 *   propio chequeo de dispositivos en DeviceCheck).
 * - disableDeepLinking evita que el móvil intente abrir la app de Jitsi,
 *   una de las principales trabas reportadas en celulares.
 * - Pantalla de error con respaldo para abrir la sala en otra pestaña si
 *   el iframe no carga (bloqueadores de anuncios, redes restrictivas).
 */
export function JitsiMeetingRoom({
  roomName,
  displayName,
  email = '',
  startWithVideoMuted = false,
  jaas,
  onReadyToClose,
}: JitsiMeetingRoomProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const apiRef = useRef<JitsiExternalApi | null>(null)

  // Watchdog: si la API no responde en LOAD_TIMEOUT_MS, algo bloqueó el script.
  useEffect(() => {
    if (loadState !== 'loading') return
    const timeout = setTimeout(() => setLoadState('failed'), LOAD_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [loadState, reloadKey])

  if (loadState === 'failed') {
    return (
      <div className="w-full h-full min-h-0 bg-bg-alt flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-lg font-bold text-text">No pudimos cargar la videollamada</h2>
          <p className="text-text-light text-sm">
            Revisa tu conexión a internet. Si usas un bloqueador de anuncios o una red con
            firewall, desactívalo para este sitio o abre la sala en una pestaña nueva.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="gap-2"
              onClick={() => {
                setLoadState('loading')
                setReloadKey((k) => k + 1)
              }}
            >
              <RefreshCw size={16} /> Reintentar
            </Button>
            <a
              href={getJitsiRoomUrl(roomName, jaas ? { appId: jaas.appId, jwt: jaas.jwt } : undefined)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border-2 border-primary text-primary-dark hover:bg-primary-dark hover:text-white transition-all"
            >
              <ExternalLink size={16} /> Abrir en pestaña nueva
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Props comunes de la reunión (compartidos por JitsiMeeting y JaaSMeeting).
  const meetingProps = {
    roomName,
    lang: 'es',
    spinner: () => <p className="text-text-light">Preparando videollamada…</p>,
    configOverwrite: {
      prejoinPageEnabled: false,
      startWithAudioMuted: false,
      startWithVideoMuted,
      disableDeepLinking: true,
      enableWelcomePage: false,
      enableClosePage: false,
      disableInviteFunctions: true,
      hideConferenceSubject: true,
      defaultLanguage: 'es',
      // Calidad: 720p ideal para sesiones 1:1 (mejor nitidez que el
      // adaptativo por defecto del servidor público, sin exigir de más).
      resolution: 720,
      maxFullResolutionParticipantCount: 2,
      constraints: {
        video: {
          height: { ideal: 720, max: 1080 },
          width: { ideal: 1280, max: 1920 },
        },
      },
    },
    interfaceConfigOverwrite: {
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
    },
    userInfo: { displayName, email },
    getIFrameRef: (parentNode: HTMLDivElement) => {
      parentNode.style.height = '100%'
      parentNode.style.width = '100%'
    },
    onApiReady: (externalApi: JitsiExternalApi) => {
      apiRef.current = externalApi
      setLoadState('ready')
      // Cuando cualquier participante cuelga desde la barra de Jitsi.
      externalApi.addListener('videoConferenceLeft', () => onReadyToClose?.())
    },
    onReadyToClose,
  }

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-bg-alt">
      {loadState === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-alt">
          <p className="text-text-light">Conectando con la sala…</p>
        </div>
      )}
      {jaas ? (
        <JaaSMeeting key={reloadKey} appId={jaas.appId} jwt={jaas.jwt} {...meetingProps} />
      ) : (
        <JitsiMeeting key={reloadKey} domain={getJitsiDomain()} {...meetingProps} />
      )}
    </div>
  )
}
