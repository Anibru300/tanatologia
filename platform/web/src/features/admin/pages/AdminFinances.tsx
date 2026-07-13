import { ComingSoon } from '@/components/ComingSoon'

export function AdminFinances() {
  return (
    <ComingSoon
      title="Finanzas"
      description="El panel financiero se habilitará junto con la pasarela de pagos."
      actionLabel="Ver citas"
      actionTo="/admin/citas"
    />
  )
}
