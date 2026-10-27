import { useEffect, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { registerSW } from 'virtual:pwa-register'
import { Button } from '@/components/ui/Button'
import { APP_VERSION } from '@/lib/version'

type PromptState =
  | { kind: 'hidden' }
  | { kind: 'update'; apply: () => Promise<void> }
  | { kind: 'offline' }

/**
 * Marca de sesión: una actualización fue aceptada pero puede quedar incompleta
 * (el service worker nuevo sigue "waiting"). Sobrevive al reload para que la
 * completemos solos sin volver a pedírselo al usuario.
 */
const PENDING_KEY = 'sc_pwa_update_pending'
const ATTEMPTS_KEY = 'sc_pwa_update_attempts'
const MAX_ATTEMPTS = 3

// Guard a nivel de módulo: nunca recargar dos veces por el mismo cambio de control.
let reloading = false

function guardedReload() {
  if (reloading) return
  reloading = true
  window.location.reload()
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* almacenamiento no disponible: se omite */
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
    sessionStorage.removeItem(ATTEMPTS_KEY)
  } catch {
    /* almacenamiento no disponible: se omite */
  }
}

/**
 * Banner fijo de actualización de la PWA (flujo estilo viajespro):
 * cuando el service worker nuevo está esperando, se ofrece "Actualizar";
 * al aceptar, skipWaiting + reload conservan la sesión de Supabase.
 *
 * Robustecido tras reporte real (2026-10-26, Android 10/Chrome): en móviles el
 * mensaje SKIP_WAITING a veces se pierde o el evento `controlling` no llega con
 * isUpdate, y el SW nuevo queda esperando para siempre → el banner reaparecía en
 * cada carga. Por eso, tras aceptar: (1) recargamos en el primer controllerchange
 * sin depender de isUpdate, (2) reenviamos SKIP_WAITING al worker waiting como
 * respaldo y (3) forzamos la recarga igual; si al recargar aún hay un SW esperando,
 * la retomamos solos (máx. 3 intentos) en vez de volver a molestar al usuario.
 * También se revisa la actualización al volver de segundo plano (Android congela
 * la PWA y no refetcha el SW al reanudar).
 */
export function PwaUpdatePrompt() {
  const [state, setState] = useState<PromptState>({ kind: 'hidden' })
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setState({
          kind: 'update',
          apply: () => {
            // 1) Al aceptar: recargar apenas el SW nuevo tome el control
            //    (clientsClaim dispara controllerchange). No dependemos de
            //    isUpdate: aquí sabemos que el usuario pidió actualizar.
            const onControl = () => guardedReload()
            navigator.serviceWorker?.addEventListener('controllerchange', onControl)
            // 2) Pedir al SW waiting que active (flujo normal).
            writeSession(PENDING_KEY, '1')
            writeSession(ATTEMPTS_KEY, '1')
            const applyResult = update(true).catch(() => setState({ kind: 'hidden' }))
            // 3) Respaldo: si el mensaje se perdió (bug conocido en Chrome
            //    móvil), reenviarlo directo al worker waiting y recargar igual.
            window.setTimeout(() => {
              navigator.serviceWorker?.removeEventListener('controllerchange', onControl)
              const waiting = registrationRef.current?.waiting
              if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' })
              window.setTimeout(guardedReload, 1500)
            }, 6000)
            return applyResult
          },
        })
      },
      onOfflineReady() {
        setState({ kind: 'offline' })
      },
      onRegisteredSW(_url, registration) {
        registrationRef.current = registration ?? null
        const reg = registrationRef.current
        if (!reg) return

        // Android reanuda la PWA sin refetchar el SW: revisar al volver a
        // primer plano y cada hora para detectar versiones nuevas a tiempo.
        const check = () => {
          if (navigator.onLine) reg.update().catch(() => {})
        }
        window.setInterval(check, 60 * 60 * 1000)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })

        // Si la última recarga quedó a medias (se aceptó actualizar pero el SW
        // sigue waiting), completar la activación sin pedirlo de nuevo.
        const attempts = Number(readSession(ATTEMPTS_KEY) ?? '0')
        if (readSession(PENDING_KEY) === '1' && reg.waiting) {
          if (attempts >= MAX_ATTEMPTS) {
            // No se logró activar tras varios intentos: limpiar y mostrar el
            // banner de nuevo para que el usuario decida (o lo descarte).
            clearPending()
            return
          }
          writeSession(ATTEMPTS_KEY, String(attempts + 1))
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          navigator.serviceWorker?.addEventListener('controllerchange', guardedReload, { once: true })
          window.setTimeout(guardedReload, 4000)
        } else if (!reg.waiting) {
          // Actualización completada (o no había nada pendiente): limpiar marca.
          clearPending()
        }
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
