import { cn } from '@/lib/utils'
import { AnchorHTMLAttributes, forwardRef } from 'react'

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'outline' | 'danger-outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary: 'bg-primary-dark text-white hover:bg-primary-darker',
  secondary: 'bg-secondary-dark text-white hover:bg-secondary-darker',
  accent: 'bg-accent-dark text-white hover:bg-accent-darker',
  danger: 'bg-error-dark text-white hover:bg-error-darker',
  outline: 'bg-transparent text-primary-dark border-2 border-primary hover:bg-primary-dark hover:border-primary-dark hover:text-white',
  'danger-outline': 'bg-transparent text-error-dark border-2 border-error hover:bg-error-dark hover:border-error-dark hover:text-white',
  ghost: 'bg-transparent text-primary-dark hover:bg-primary/10',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

/** Enlace con apariencia de botón del sistema (para hrefs mailto/tel/externos). */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/60 focus-visible:ring-offset-2',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </a>
    )
  }
)

LinkButton.displayName = 'LinkButton'
