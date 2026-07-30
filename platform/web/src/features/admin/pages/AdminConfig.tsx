import { ComingSoon } from '@/components/ComingSoon'

export function AdminConfig() {
  return (
    <ComingSoon
      title="Configuración"
      description="Los ajustes globales de la plataforma (comisiones, correos, recordatorios) estarán disponibles en una próxima versión."
      actionLabel="Volver al panel"
      actionTo="/admin"
    />
  )
}
