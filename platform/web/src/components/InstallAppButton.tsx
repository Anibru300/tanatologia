import { useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useInstallPrompt } from '@/components/useInstallPrompt'

/** Instrucciones paso a paso (iOS/Android) cuando no hay prompt nativo. */
function InstallHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Instalar SOMOS-CALMA en tu celular">
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
          La app se instala con tu sesión activa: solo verás tu portal (paciente,
          profesional o administrador), sin páginas públicas.
        </p>
      </div>
    </Modal>
  )
}

/**
 * Botón "Instalar app" (footer de portales, con sesión iniciada).
 * - Android/Chrome: usa el evento beforeinstallprompt para mostrar el
 *   diálogo nativo de instalación.
 * - iOS/Safari (u otros sin evento): abre instrucciones paso a paso.
 * - Desaparece cuando la app ya está instalada o en modo standalone.
 */
export function InstallAppButton() {
  const { installed, install, showHelp, setShowHelp } = useInstallPrompt()

  if (installed) return null

  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={install}>
        <Download size={18} aria-hidden />
        Instalar app en mi celular
      </Button>
      <InstallHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}

const DISMISS_KEY = 'install-banner-dismissed'

/**
 * Banner fijo de instalación para las pantallas de acceso (login/registro).
 * Se muestra solo si la app NO está instalada y el usuario no lo cerró en
 * esta sesión. Al tocar "Instalar" usa el prompt nativo (Android) o abre
 * las instrucciones (iOS).
 */
export function InstallAppBanner() {
  const { installed, install, showHelp, setShowHelp } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  )

  if (installed || dismissed) return null

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto bg-surface border border-border rounded-lg shadow-lg p-4 flex items-center gap-3">
          <img
            src="/assets/images/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="rounded-md shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">Instala la app de SOMOS-CALMA</p>
            <p className="text-xs text-text-light">
              Acceso directo en tu pantalla de inicio, como una app.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" onClick={install}>
              Instalar
            </Button>
            <button
              onClick={dismiss}
              aria-label="Cerrar aviso de instalación"
              className="p-1.5 text-text-light hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
      <InstallHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
