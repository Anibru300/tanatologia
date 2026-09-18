# Reporte — PWA instalable con actualizaciones automáticas (2026-09-17)

## Objetivo
Adaptar la plataforma (`/app/`) para que sea instalable como app en celular (Android y iPhone/iPad),
"auto funcional" y con generación de actualizaciones/versiones, tomando como referencia la
estructura del repositorio `Anibru300/viajespro` (manifest + service worker + flujo de
actualización con sesión conservada).

## Qué se hizo

### 1. Service Worker y manifest (vite-plugin-pwa v1.3.0)
- Nueva dependencia de desarrollo `vite-plugin-pwa` en `platform/web` (soporta Vite 8).
- `vite.config.ts`: plugin `VitePWA` con `registerType: 'prompt'` (el SW nuevo espera a que el
  usuario acepte, igual que el flujo `skipWaiting` manual de viajespro), `generateSW` + Workbox:
  - Precaché automático de todos los assets del build (hashes incluidos), `cleanupOutdatedCaches`,
    `clientsClaim`, `skipWaiting: false`, `navigateFallback: 'index.html'`,
    límite de archivo 4 MB.
  - **No hay runtime caching**: las llamadas a Supabase, Jitsi/8x8 y Resend pasan directo a red
    (evita el problema de viajespro de tener que excluir orígenes de API a mano).
- Manifest de la app generado en `/app/manifest.webmanifest`:
  `id`/`start_url`/`scope` = `/app/`, `display: standalone`, `orientation: portrait`,
  `lang: es`, colores de marca (`#7A8B6E` / `#F7F5F2`), iconos reutilizados de la raíz del sitio
  (`/assets/images/icon-192.png`, `icon-512.png`, `purpose: any` + `maskable` con el 512).

### 2. Flujo de actualización (banner "Nueva versión disponible")
- `src/components/PwaUpdatePrompt.tsx`: registra el SW vía `virtual:pwa-register`
  (`registerSW({ onNeedRefresh, onOfflineReady })`). Al detectar un SW nuevo esperando muestra un
  banner fijo (componentes `Button`/`Alert` del design system) con la nueva versión y botón
  **Actualizar** → `updateSW(true)` → `skipWaiting` + reload. La sesión de Supabase vive en
  localStorage, **el inicio de sesión se conserva tras actualizar** (mismo comportamiento que
  viajespro con Firebase Auth). Incluye toast de "Lista para usarse sin conexión" y botón de
  descartar el aviso.
- Montado en `src/main.tsx` (fuera de los layouts, visible también en login).

### 3. Versionado visible
- `package.json` → `1.1.0-beta.1` (era `1.0.0-beta.1`).
- `__APP_VERSION__` inyectada por `vite.config.ts` (define) → `src/lib/version.ts` → se muestra
  en el banner de actualización y en el footer del sidebar de `PortalLayout` (los 3 portales).
- **Convención para releases:** bump de versión en `package.json` en cada release. El SW cambia
  de contenido en cada build (hashes de precaché), así que la detección de nueva versión es
  automática aunque se olvide el bump (solo el número mostrado quedaría desactualizado).

### 4. Soporte iOS (iPhone/iPad)
`platform/web/index.html`: `theme-color`, `apple-touch-icon` (`/assets/images/icon-180.png`,
ya existente), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
`apple-mobile-web-app-title`. iOS no lee `beforeinstallprompt` — la instalación es vía
"Compartir → Agregar a pantalla de inicio".

## Despliegue
Sin cambios en `.github/workflows/deploy-app.yml`: el build (`dist`) ya incluye `sw.js`,
`manifest.webmanifest` y el código de registro; el paso "Copiar build a /app" los publica.
GitHub Pages sirve todo sobre HTTPS (requisito de PWA ✓). Scope `/app/` aislado del sitio
estático de la raíz (que conserva su propio `manifest.json` sin SW).

## Pruebas
- `npm run lint`: 0 errores (1 warning preexistente en `scripts/test-chat.mjs`, no relacionado).
- `npm run test` (Vitest): 31/31.
- `npm run build` (tsc + vite): ✓ sin errores; `dist` contiene `sw.js`, `workbox-*.js`,
  `manifest.webmanifest`; el banner quedó empaquetado (`grep` en el chunk).
- Smoke con `vite preview` (simula GitHub Pages con base `/app/`):
  `/app/`, `/app/sw.js`, `/app/manifest.webmanifest`, `/app/index.html` → 200;
  manifest con `lang: "es"`, `start_url`/`scope` `/app/`; `<link rel="manifest">` presente.

## Pendiente (requiere verificación en dispositivo real)
1. **Android/Chrome:** instalar desde "Agregar a pantalla de inicio" tras el próximo deploy y
   verificar que aparece el banner de actualización en el siguiente release.
2. **iOS/Safari:** "Compartir → Agregar a inicio"; validar icono (icon-180) y modo standalone.
3. Comportamiento offline de la app shell (las llamadas a Supabase fallarán sin red; la UI ya
   muestra errores con `Alert`).
