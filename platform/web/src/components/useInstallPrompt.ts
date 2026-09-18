import { useEffect, useState } from 'react'

/** Evento beforeinstallprompt (no tipado en el estándar aún). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isInstalled(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari: standalone mode
  return (navigator as unknown as { standalone?: boolean }).standalone === true
}

/** Estado compartido de instalación PWA. */
export function useInstallPrompt() {
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

  const install = async () => {
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

  return { deferred, installed, install, showHelp, setShowHelp }
}
