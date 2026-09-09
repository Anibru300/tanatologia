import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Check, Copy, ExternalLink, RefreshCw, Video } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/useAuth'
import { fetchJaasTestToken, type JaasToken } from '@/lib/jaasService'
import { generateJitsiRoomName } from '@/lib/video'

const VideoCallExperience = lazy(() =>
  import('@/components/video/VideoCallExperience').then((m) => ({ default: m.VideoCallExperience }))
)

type JaasStatus = 'checking' | 'ok' | 'not_configured' | 'error'

const STATUS_BADGE: Record<JaasStatus, { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
  checking: { variant: 'default', label: 'Verificando…' },
  ok: { variant: 'success', label: 'JaaS activo' },
  not_configured: { variant: 'warning', label: 'JaaS no configurado' },
  error: { variant: 'error', label: 'Error de configuración' },
}

/**
 * Sala de prueba de videollamada para el panel admin.
 * Usa la misma infraestructura JaaS (8x8.vc) que las citas reales —sin límite
 * de 5 minutos de meet.jit.si— pero sin necesidad de crear una cita: la Edge
 * Function `jaas-token` firma un JWT con { testRoom } solo para administradores.
 */
export function AdminVideoTest() {
  const { user } = useAuth()
  // Nombre de sala estable durante la vida de la página: el mismo para la sala
  // embebida y para las instrucciones de "probar desde otro dispositivo".
  const roomName = useMemo(() => generateJitsiRoomName(), [])

  const [token, setToken] = useState<JaasToken | null>(null)
  const [status, setStatus] = useState<JaasStatus>('checking')
  const [reason, setReason] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [copied, setCopied] = useState(false)

  const checkToken = useCallback(async () => {
    setStatus('checking')
    const res = await fetchJaasTestToken(roomName)
    setToken(res.token)
    setReason(res.reason)
    setStatus(
      res.token ? 'ok' : res.reason?.includes('(501)') ? 'not_configured' : 'error'
    )
  }, [roomName])

  useEffect(() => {
    checkToken()
  }, [checkToken])

  // Estable: evita que VideoCallExperience refetchee el token en cada render.
  const getTestToken = useCallback(
    () => fetchJaasTestToken(roomName),
    [roomName]
  )

  async function copyRoomName() {
    try {
      await navigator.clipboard.writeText(roomName)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard puede fallar en contextos no seguros; el nombre sigue visible.
    }
  }

  // Sala activa: experiencia completa a viewport completo (DeviceCheck + Jitsi).
  if (active) {
    return (
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[60] bg-bg flex items-center justify-center">
            <p className="text-text-light">Cargando videollamada...</p>
          </div>
        }
      >
        <VideoCallExperience
          roomName={roomName}
          displayName={user?.fullName || 'Administrador'}
          title="Prueba de videollamada"
          subtitle={`Sala de prueba JaaS (8x8.vc) · ${roomName} · sin límite de 5 minutos`}
          preJoinTip="Sala de prueba sin cita real: no se cierra a los 5 minutos. Para probar entre dos personas, entra también desde otro navegador o dispositivo con el mismo nombre de sala (página Prueba de video del admin)."
          fetchToken={getTestToken}
          onExit={() => setActive(false)}
        />
      </Suspense>
    )
  }

  const badge = STATUS_BADGE[status]
  // URL directa con JWT (válido ~3 h): útil para abrir la sala en otra
  // pestaña/dispositivo y verificar que la firma es aceptada por 8x8.vc.
  const externalUrl = token
    ? `https://${token.domain}/${token.appId}/${roomName}?jwt=${encodeURIComponent(token.jwt)}`
    : null

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Prueba de videollamada</h1>
          <p className="text-text-light">
            Entra a una sala real de JaaS (8x8.vc) para comprobar que las videollamadas de la
            plataforma funcionan: misma infraestructura que las citas, sin límite de 5 minutos
            de meet.jit.si y sin necesidad de agendar una cita de prueba.
          </p>
        </div>

        <div className="grid gap-6 max-w-3xl">
          {/* Estado de la configuración JaaS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Estado de JaaS
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </CardTitle>
              <CardDescription>
                Se firmó un token de prueba contra la Edge Function <code>jaas-token</code> con
                tu sesión de administrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === 'checking' && (
                <p className="text-text-light text-sm">Verificando configuración…</p>
              )}
              {status === 'ok' && (
                <Alert variant="success">
                  El token JaaS se firmó correctamente para la sala <strong>{roomName}</strong>.
                  Las videollamadas de la plataforma usarán JaaS (sin límite de tiempo).
                </Alert>
              )}
              {status === 'not_configured' && (
                <Alert variant="warning">
                  JaaS no está configurado en el servidor (faltan los secrets JAAS_APP_ID,
                  JAAS_KID o JAAS_PRIVATE_KEY). La prueba usará la sala de respaldo meet.jit.si,
                  que <strong>se cierra a los 5 minutos</strong>. Motivo: {reason}.
                </Alert>
              )}
              {status === 'error' && (
                <Alert variant="error">
                  No se pudo firmar el token de prueba. Motivo: {reason}.
                  {(reason?.includes('(401)') ?? false) && ' Vuelve a iniciar sesión.'}
                </Alert>
              )}
              {status !== 'checking' && (
                <Button variant="outline" size="sm" className="gap-2" onClick={checkToken}>
                  <RefreshCw size={16} /> Verificar de nuevo
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Sala de prueba */}
          <Card>
            <CardHeader>
              <CardTitle>Sala de prueba</CardTitle>
              <CardDescription>
                Entra a la sala para probar cámara, micrófono y conexión. Puedes permanecer el
                tiempo que quieras: JaaS no corta la sesión.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-text-light text-sm mb-1">Nombre de la sala</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <code className="flex-1 px-4 py-3 rounded-sm border border-border bg-bg-alt text-text text-sm break-all">
                    {roomName}
                  </code>
                  <Button variant="outline" className="gap-2 shrink-0" onClick={copyRoomName}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="gap-2" onClick={() => setActive(true)}>
                  <Video size={18} /> Iniciar videollamada de prueba
                </Button>
                {externalUrl && (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border-2 border-primary text-primary-dark hover:bg-primary-dark hover:text-white transition-all"
                  >
                    <ExternalLink size={16} /> Abrir en pestaña nueva
                  </a>
                )}
              </div>

              {status === 'ok' && (
                <p className="text-text-light text-sm">
                  Para probar entre dos personas: abre el enlace de arriba en una segunda pestaña
                  o en tu celular —ambas entran a la misma sala con token válido—, o copia el
                  nombre de la sala para unirte manualmente desde otro navegador.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Qué conviene probar */}
          <Card>
            <CardHeader>
              <CardTitle>Qué conviene verificar</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-text-light text-sm">
                <li>Que la sala cargue sin pantalla de error (iframe bloqueado, red, VPN).</li>
                <li>Cámara y micrófono: el chequeo previo debe detectar ambos.</li>
                <li>Dos participantes: entra desde otra pestaña/dispositivo y confirma audio y video bidireccionales.</li>
                <li>Duración: permanece más de 5 minutos —si la sala se cierra sola, estás en el fallback meet.jit.si y JaaS no está activo.</li>
                <li>Calidad: la configuración fija 720p para sesiones 1:1.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
