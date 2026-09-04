import { Star } from 'lucide-react'

export function StarRating({
  value,
  onChange,
  size = 24,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
}) {
  return (
    <div className="flex items-center gap-1" role={onChange ? 'radiogroup' : undefined} aria-label="Calificación de 5 estrellas">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        const star = (
          <Star
            size={size}
            className={filled ? 'text-warning fill-warning' : 'text-muted'}
            aria-hidden
          />
        )
        if (!onChange) return <span key={n}>{star}</span>
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
            className="p-1 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-sm"
            onClick={() => onChange(n)}
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}
