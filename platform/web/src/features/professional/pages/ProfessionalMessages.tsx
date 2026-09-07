import { useSearchParams } from 'react-router-dom'
import { ChatPage } from '@/features/messages/ChatPage'

export function ProfessionalMessages() {
  const [searchParams] = useSearchParams()
  const withParam = searchParams.get('with')

  return (
    <ChatPage
      audience="professional"
      emptyActionTo="/profesional/pacientes"
      emptyActionLabel="Ver mis pacientes"
      initialCounterpartyId={withParam}
    />
  )
}
