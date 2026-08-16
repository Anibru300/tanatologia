import { MessagesInterim } from '@/features/messages/MessagesInterim'

export function ProfessionalMessages() {
  return (
    <MessagesInterim
      audience="professional"
      appointmentsTo="/profesional/agenda"
      appointmentsLabel="Ir a mi agenda"
    />
  )
}
