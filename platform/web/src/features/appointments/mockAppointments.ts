import { generateJitsiRoomName } from '@/lib/video'

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type SessionType = 'single' | 'program_4' | 'program_6'

export type Appointment = {
  id: string
  patientId: string
  patientName: string
  professionalId: string
  professionalName: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMinutes: number
  status: AppointmentStatus
  sessionType: SessionType
  serviceName: string
  videoLink: string
}

// UUIDs reales de las cuentas demo creadas en Supabase.
// Si regeneras los usuarios demo, actualiza estos valores.
export const DEMO_PATIENT_ID = '3867b2ad-e762-4ac2-80c4-dc8ce6f703db'
export const DEMO_PROFESSIONAL_ID = 'e08bf944-2ec8-4382-ae18-3058491ad6b5'

/**
 * Mock central de citas. Paciente y profesional leen/escriben aquí
 * para que ambos vean la misma cita y puedan entrar a la misma sala de Jitsi.
 * TODO: Reemplazar por tabla `appointments` de Supabase cuando se conecte el backend.
 */
export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'af209b35-827e-40ca-8044-e794a76223f8',
    patientId: DEMO_PATIENT_ID,
    patientName: 'Ana Demo',
    professionalId: DEMO_PROFESSIONAL_ID,
    professionalName: 'Dra. María Demo',
    date: '2026-07-12',
    time: '10:00',
    durationMinutes: 50,
    status: 'confirmed',
    sessionType: 'single',
    serviceName: 'Consulta aislada',
    videoLink: generateJitsiRoomName('af209b35-827e-40ca-8044-e794a76223f8'),
  },
  {
    id: 'fc4fa438-0e76-4d16-a45e-279ada43eefc',
    patientId: DEMO_PATIENT_ID,
    patientName: 'Ana Demo',
    professionalId: 'profesional-2',
    professionalName: 'Lic. Javier López',
    date: '2026-06-28',
    time: '16:00',
    durationMinutes: 50,
    status: 'completed',
    sessionType: 'program_4',
    serviceName: 'Programa Salud Mental',
    videoLink: generateJitsiRoomName('fc4fa438-0e76-4d16-a45e-279ada43eefc'),
  },
]

export function getAppointmentById(id: string): Appointment | undefined {
  return MOCK_APPOINTMENTS.find((a) => a.id === id)
}

export function addAppointment(appointment: Appointment): void {
  MOCK_APPOINTMENTS.unshift(appointment)
}

export function getAppointmentsForPatient(patientId: string): Appointment[] {
  return MOCK_APPOINTMENTS.filter((a) => a.patientId === patientId)
}

export function getAppointmentsForProfessional(professionalId: string): Appointment[] {
  return MOCK_APPOINTMENTS.filter((a) => a.professionalId === professionalId)
}
