/** Versión de la app (package.json), inyectada en build por vite.config.ts. */
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
