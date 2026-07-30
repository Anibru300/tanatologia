import { cn } from '@/lib/utils'

interface ChipMultiSelectProps {
  label: string
  options: string[]
  values: string[]
  onChange: (values: string[]) => void
}

export function ChipMultiSelect({ label, options, values, onChange }: ChipMultiSelectProps) {
  const toggle = (option: string) => {
    if (values.includes(option)) {
      onChange(values.filter((v) => v !== option))
    } else {
      onChange([...values, option])
    }
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={selected}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                selected
                  ? 'bg-primary-dark text-white border-primary'
                  : 'bg-surface text-text-light border-border hover:border-primary hover:text-primary'
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
