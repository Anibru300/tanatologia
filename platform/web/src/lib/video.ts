/**
 * Utilidades para videollamadas con Jitsi Meet.
 * Por defecto usamos meet.jit.si (gratuito). En producción con datos sensibles
 * se recomienda migrar a un servidor Jitsi propio.
 */

const JITSI_SERVER = 'https://meet.jit.si'
const ROOM_PREFIX = 'somos-calma'

/**
 * Genera un nombre de sala único y válido para Jitsi a partir del ID de cita.
 * Jitsi acepta letras, números, guiones y puntos; eliminamos caracteres extraños.
 */
export function generateJitsiRoomName(appointmentId: string): string {
  const sanitized = appointmentId
    .toLowerCase()
    .replace(/[^a-z0-9\-.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${ROOM_PREFIX}-${sanitized}`
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
