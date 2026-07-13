import { ComingSoon } from '@/components/ComingSoon'

export function AdminPayments() {
  return (
    <ComingSoon
      title="Pagos"
      description="La gestión de pagos y reembolsos se habilitará junto con la pasarela de pagos."
      actionLabel="Ver citas"
      actionTo="/admin/citas"
    />
  )
}
