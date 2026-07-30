import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { ReactNode, useEffect, useState } from 'react'

interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info'
  children: ReactNode
  className?: string
  /** Si se indica (ms), la alerta se oculta sola pasado ese tiempo. */
  autoDismiss?: number
  onDismiss?: () => void
}

const styles = {
  success: 'bg-success/10 text-success-dark',
  error: 'bg-error/10 text-error-dark',
  warning: 'bg-warning/10 text-warning-dark',
  info: 'bg-secondary/10 text-secondary-dark',
}

const icons = {
  success: CheckCircle,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
}

/** Banner de feedback del sistema. `error` usa role="alert"; el resto role="status". */
export function Alert({ variant = 'info', children, className, autoDismiss, onDismiss }: AlertProps) {
  const [visible, setVisible] = useState(true)
  const Icon = icons[variant]

  useEffect(() => {
    setVisible(true)
    if (!autoDismiss) return
    const t = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, autoDismiss)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismiss])

  if (!visible) return null

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 p-3 rounded-sm text-sm', styles[variant], className)}
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={() => {
            setVisible(false)
            onDismiss()
          }}
          aria-label="Cerrar aviso"
          className="shrink-0 p-0.5 rounded-full hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
