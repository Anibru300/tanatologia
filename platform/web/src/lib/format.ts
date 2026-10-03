// Formateo de moneda (precios almacenados en centavos MXN)
export function formatMXN(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return `$${Math.round(cents / 100).toLocaleString('es-MX')} MXN`
}
