import { useSearchParams } from 'react-router-dom'
import { ChatPage } from '@/features/messages/ChatPage'

export function PatientMessages() {
  const [searchParams] = useSearchParams()
  const withParam = searchParams.get('with')

  return (
    <ChatPage
      audience="patient"
      emptyActionTo="/paciente/agendar"
      emptyActionLabel="Agendar una cita"
      initialCounterpartyId={withParam}
    />
  )
}
