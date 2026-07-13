/**
 * Utilidades para videollamadas con Jitsi Meet.
 * Por defecto usamos meet.jit.si (gratuito). En producción con datos sensibles
 * se recomienda migrar a un servidor Jitsi propio con autenticación y cifrado.
 */

const JITSI_SERVER = 'https://meet.jit.si'
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
 * Genera un nombre de sala único y no predecible para Jitsi Meet.
 * El parámetro de ID se ignora intencionalmente para evitar salas predecibles.
 */
export function generateJitsiRoomName(_appointmentId?: string): string {
  return `${ROOM_PREFIX}-${generateRandomRoomId()}`
}

export function getJitsiServerUrl(): string {
  return JITSI_SERVER
}

/**
 * Devuelve la URL completa de una sala Jitsi (útil para iframe o compartir).
 */
export function getJitsiRoomUrl(roomName: string): string {
  return `${JITSI_SERVER}/${roomName}`
}
