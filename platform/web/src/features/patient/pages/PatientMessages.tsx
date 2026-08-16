import { MessagesInterim } from '@/features/messages/MessagesInterim'

export function PatientMessages() {
  return (
    <MessagesInterim
      audience="patient"
      appointmentsTo="/paciente/citas"
      appointmentsLabel="Ir a mis citas"
    />
  )
}
