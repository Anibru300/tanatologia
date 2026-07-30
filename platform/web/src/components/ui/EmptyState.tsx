import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
  className?: string
  /** Sin tarjeta envolvente (para usar dentro de tablas u otros contenedores). */
  bare?: boolean
}

/** Estado vacío estándar del sistema: icono + mensaje + CTA opcional. */
export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, className, bare }: EmptyStateProps) {
  const content = (
    <div className={cn('text-center', bare ? 'py-8' : 'p-8', className)}>
      <Icon size={48} className="mx-auto mb-4 text-muted" aria-hidden />
      <p className="text-text font-medium mb-1">{title}</p>
      {description && <p className="text-text-light text-sm mb-4">{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <Button size="sm" className="mt-2">{actionLabel}</Button>
        </Link>
      )}
    </div>
  )

  if (bare) return content
  return (
    <Card>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
