import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { ReactNode, useEffect, useRef } from 'react'

// Pila de modales abiertos: solo el modal superior responde a Escape
// (evita que modales anidados, p.ej. ConfirmDialog sobre un detalle, se cierren juntos).
const openModals: symbol[] = []

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

/** Modal accesible del sistema: cierra con Escape y clic en el fondo,
 *  bloquea el scroll del body y expone role="dialog". */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const idRef = useRef(Symbol('modal'))
  // El auto-foco solo debe ocurrir al ABRIR el modal. Antes se hacía en cada
  // re-ejecución del efecto (cualquier re-render con onClose inline, p.ej.
  // una arrow en la página, lo disparaba) y robaba el foco de los inputs en
  // cada tecla (bug: escribir letra por letra en modales con textarea).
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }

    const id = idRef.current
    openModals.push(id)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === id) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    if (!wasOpenRef.current) {
      panelRef.current?.focus()
      wasOpenRef.current = true
    }

    return () => {
      const idx = openModals.indexOf(id)
      if (idx !== -1) openModals.splice(idx, 1)
      document.removeEventListener('keydown', onKeyDown)
      if (openModals.length === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-sm"
      onClick={() => {
        if (openModals[openModals.length - 1] === idRef.current) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'bg-surface rounded shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto outline-none',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2 className="text-xl font-semibold text-text">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 rounded-full text-text-light hover:bg-bg-alt hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/60"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>
  )
}
