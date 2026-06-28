import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface rounded-[20px] border border-border shadow p-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = ({ className, children }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)}>{children}</div>
)

export const CardTitle = ({ className, children }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-xl font-semibold text-text', className)}>{children}</h3>
)

export const CardDescription = ({ className, children }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-text-light text-sm mt-1', className)}>{children}</p>
)

export const CardContent = ({ className, children }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)}>{children}</div>
)
