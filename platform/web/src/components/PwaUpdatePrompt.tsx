import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { registerSW } from 'virtual:pwa-register'
import { Button } from '@/components/ui/Button'
import { APP_VERSION } from '@/lib/version'

type PromptState =
  | { kind: 'hidden' }
  | { kind: 'update'; apply: () => Promise<void> }
  | { kind: 'offline' }

/**
 * Banner fijo de actualización de la PWA (flujo estilo viajespro):
 * cuando el service worker nuevo está esperando, se ofrece "Actualizar";
 * al aceptar, skipWaiting + reload conservan la sesión de Supabase.
 * También avisa cuando la app quedó lista para usarse sin conexión.
 */
export function PwaUpdatePrompt() {
  const [state, setState] = useState<PromptState>({ kind: 'hidden' })

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setState({
          kind: 'update',
          apply: () => update(true).catch(() => setState({ kind: 'hidden' })),
        })
      },
      onOfflineReady() {
        setState({ kind: 'offline' })
      },
    })
  }, [])

  useEffect(() => {
    if (state.kind !== 'offline') return
    const t = setTimeout(() => setState({ kind: 'hidden' }), 6000)
    return () => clearTimeout(t)
  }, [state.kind])

  if (state.kind === 'hidden') return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[80] bg-surface border border-border rounded-md shadow-lg p-4 flex items-center gap-3"
    >
      {state.kind === 'update' ? (
        <>
          <RefreshCw size={20} className="text-primary shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text">Nueva versión disponible (v{APP_VERSION})</p>
            <p className="text-xs text-text-light">Actualiza para tener los últimos cambios. Tu sesión se conserva.</p>
          </div>
          <Button size="sm" onClick={() => void state.apply()}>
            Actualizar
          </Button>
          <button
            type="button"
            aria-label="Descartar aviso de actualización"
            className="p-1 text-text-light hover:text-text"
            onClick={() => setState({ kind: 'hidden' })}
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <RefreshCw size={20} className="text-primary shrink-0" aria-hidden />
          <p className="flex-1 text-sm text-text">La app está lista para usarse sin conexión.</p>
          <button
            type="button"
            aria-label="Cerrar aviso"
            className="p-1 text-text-light hover:text-text"
            onClick={() => setState({ kind: 'hidden' })}
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  )
}
