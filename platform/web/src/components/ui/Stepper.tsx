import { Check } from 'lucide-react'

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep

          return (
            <div key={step.label} className="flex-1 relative">
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2 ${
                    isCompleted ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
              <div className="relative flex flex-col items-center text-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-colors ${
                    isCompleted
                      ? 'bg-primary border-primary text-white'
                      : isCurrent
                      ? 'bg-surface border-primary text-primary'
                      : 'bg-surface border-border text-muted'
                  }`}
                >
                  {isCompleted ? <Check size={18} /> : index + 1}
                </div>
                <div className="mt-2 px-1">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent ? 'text-text' : isUpcoming ? 'text-text-light' : 'text-text'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-text-light hidden sm:block">{step.description}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
