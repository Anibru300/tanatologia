/**
 * Proveedor actual: Jitsi Meet.
 * - Modo gratuito: meet.jit.si (limitado a 5 min en modo demo/embebido).
 * - Modo producción: JaaS (8x8.vc) con JWT firmado por la Edge Function
 *   `jaas-token`; el frontend lo obtiene al entrar a la sala y, si no está
 *   configurado, cae automáticamente a meet.jit.si.
 * El dominio base se puede cambiar con VITE_JITSI_DOMAIN sin tocar código.
 * Con datos sensibles de salud, el objetivo a mediano plazo es un servidor
 * con autenticación JWT y sin terceros.
 */

const DEFAULT_JITSI_DOMAIN = 'meet.jit.si'
const ROOM_PREFIX = 'somos-calma'

function generateRandomRoomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  // Fallback determinista solo si crypto no está disponible (navegadores antiguos).
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  )
}

/**
 * Genera un nombre de sala único y no predecible.
 * El parámetro de ID se ignora intencionalmente para evitar salas predecibles.
 */
export function generateJitsiRoomName(_appointmentId?: string): string {
  return `${ROOM_PREFIX}-${generateRandomRoomId()}`
}

/**
 * Dominio del servidor Jitsi (sin protocolo ni slash final).
 * Configurable con VITE_JITSI_DOMAIN (p. ej. '8x8.vc' al migrar a JaaS).
 */
export function getJitsiDomain(): string {
  const fromEnv = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined)?.trim()
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_JITSI_DOMAIN
}

/**
 * Devuelve la URL completa de una sala (útil como respaldo para abrir
 * la videollamada en una pestaña nueva si el iframe falla).
 * Con JaaS, la sala va prefijada con el appId y el JWT va como query param.
 */
export function getJitsiRoomUrl(
  roomName: string,
  opts?: { appId?: string; jwt?: string },
): string {
  const room = opts?.appId ? `${opts.appId}/${roomName}` : roomName
  const qs = opts?.jwt ? `?jwt=${encodeURIComponent(opts.jwt)}` : ''
  return `https://${getJitsiDomain()}/${room}${qs}`
}
