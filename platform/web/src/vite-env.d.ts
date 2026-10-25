/// <reference types="vite/client" />

interface Window {
  /** GA4 (cargado por gtag.js en index.html; puede no existir con adblock) */
  gtag?: (...args: unknown[]) => void
}
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
