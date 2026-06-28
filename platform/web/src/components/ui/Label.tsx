import { cn } from '@/lib/utils'
import { LabelHTMLAttributes, forwardRef } from 'react'

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-sm font-medium text-text mb-1.5', className)}
        {...props}
      >
        {children}
      </label>
    )
  }
)

Label.displayName = 'Label'
