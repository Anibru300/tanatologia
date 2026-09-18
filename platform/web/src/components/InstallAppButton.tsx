import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/** Evento beforeinstallprompt (no tipado en el estándar aún). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isInstalled(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari: standalone mode
  return (navigator as unknown as { standalone?: boolean }).standalone === true
}

/**
 * Botón "Instalar app" (solo dentro de los portales, con sesión iniciada).
 * - Android/Chrome: usa el evento beforeinstallprompt para mostrar el
 *   diálogo nativo de instalación.
 * - iOS/Safari (u otros sin evento): abre instrucciones paso a paso.
 * - Desaparece cuando la app ya está instalada o en modo standalone.
 */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (isInstalled()) {
      setInstalled(true)
      return
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalledEvent = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalledEvent)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalledEvent)
    }
  }, [])

  if (installed) return null

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt()
      try {
        await deferred.userChoice
      } catch {
        /* el usuario cerró el diálogo: no pasa nada */
      }
      setDeferred(null)
    } else {
      // iOS/Safari no expone beforeinstallprompt: mostrar instrucciones
      setShowHelp(true)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleClick}>
        <Download size={18} aria-hidden />
        Instalar app en mi celular
      </Button>
      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Instalar SOMOS-CALMA en tu celular">
        <div className="space-y-4 text-sm text-text">
          <div>
            <p className="flex items-center gap-2 font-medium text-text mb-1">
              <Smartphone size={16} aria-hidden /> Android (Chrome)
            </p>
            <ol className="list-decimal list-inside space-y-1 text-text-light">
              <li>Abre este sitio en Chrome.</li>
              <li>Toca el menú de tres puntos (⋮) arriba a la derecha.</li>
              <li>Elige <strong>“Agregar a pantalla de inicio”</strong> y confirma.</li>
            </ol>
          </div>
          <div>
            <p className="flex items-center gap-2 font-medium text-text mb-1">
              <Smartphone size={16} aria-hidden /> iPhone / iPad (Safari)
            </p>
            <ol className="list-decimal list-inside space-y-1 text-text-light">
              <li>Abre este sitio en Safari.</li>
              <li>Toca el botón <strong>Compartir</strong> (cuadro con flecha hacia arriba).</li>
              <li>Baja y elige <strong>“Agregar a pantalla de inicio”</strong> y confirma.</li>
            </ol>
          </div>
          <p className="text-xs text-text-light">
            La app se instala con tu sesión activa: solo verás tu portal (paciente, profesional o
            administrador), sin páginas públicas.
          </p>
        </div>
      </Modal>
    </>
  )
}
