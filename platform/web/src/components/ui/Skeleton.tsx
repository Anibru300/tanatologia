import { cn } from '@/lib/utils'

/** Placeholder de carga animado. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-bg-alt rounded-sm', className)} aria-hidden />
}

/** Skeleton estándar para listas/tarjetas del portal. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando contenido">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

/** Skeleton estándar para tablas. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Cargando contenido">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
