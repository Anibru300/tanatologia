/**
 * Configuración y utilidades para videollamadas.
 *
 * Proveedor actual: Jitsi Meet (meet.jit.si, gratuito).
 * El dominio se puede cambiar con VITE_JITSI_DOMAIN sin tocar código,
 * pensado para migrar a JaaS (8x8.vc) o a un servidor propio cuando
 * el volumen lo justifique. Con datos sensibles de salud, el objetivo a
 * mediano plazo es un servidor con autenticación JWT y sin terceros.
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
 */
export function getJitsiRoomUrl(roomName: string): string {
  return `https://${getJitsiDomain()}/${roomName}`
}
