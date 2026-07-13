import { ComingSoon } from '@/components/ComingSoon'

export function ProfessionalEarnings() {
  return (
    <ComingSoon
      title="Mis ingresos"
      description="Aquí podrás consultar el detalle de tus sesiones atendidas y los pagos correspondientes. Disponible cuando activemos la pasarela de pagos."
      actionLabel="Ir a mi agenda"
      actionTo="/profesional/agenda"
    />
  )
}
