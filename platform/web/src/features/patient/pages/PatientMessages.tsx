import { ComingSoon } from '@/components/ComingSoon'

export function PatientMessages() {
  return (
    <ComingSoon
      title="Mensajes"
      description="Estamos habilitando un espacio seguro para comunicarte con tu terapeuta. Mientras tanto, usa el correo de confirmación de tu cita o contacta a soporte."
      actionLabel="Ir a mis citas"
      actionTo="/paciente/citas"
    />
  )
}
