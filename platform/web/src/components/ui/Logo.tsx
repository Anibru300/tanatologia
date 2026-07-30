import { cn } from '@/lib/utils'

/** Marca "SC" de SOMOS-CALMA. */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  }
  return (
    <div
      className={cn(
        'rounded-full bg-primary-dark flex items-center justify-center text-white font-bold shrink-0',
        sizes[size],
        className
      )}
      aria-hidden
    >
      SC
    </div>
  )
}
