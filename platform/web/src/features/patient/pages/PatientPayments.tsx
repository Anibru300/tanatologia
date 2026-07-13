import { ComingSoon } from '@/components/ComingSoon'

export function PatientPayments() {
  return (
    <ComingSoon
      title="Pagos"
      description="Estamos configurando la pasarela de pagos segura para que puedas pagar tus sesiones y membresías de forma sencilla. Muy pronto estará disponible."
      actionLabel="Ir a mis citas"
      actionTo="/paciente/citas"
    />
  )
}
