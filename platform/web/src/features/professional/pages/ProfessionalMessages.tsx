import { ComingSoon } from '@/components/ComingSoon'

export function ProfessionalMessages() {
  return (
    <ComingSoon
      title="Mensajes"
      description="Estamos habilitando un espacio seguro para comunicarte con tus pacientes. Mientras tanto, puedes usar el correo de confirmación de cada cita."
      actionLabel="Ir a mi agenda"
      actionTo="/profesional/agenda"
    />
  )
}
