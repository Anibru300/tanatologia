/**
 * Tracking first-party de eventos puntuales (p. ej. clics a enlaces externos).
 * Reusa el endpoint `track-view` registrando un path sintético que aparece
 * en el panel Admin > Flujo de la página junto con las vistas de página.
 * Nunca lanza: un fallo de analítica no debe romper la app.
 */
const TRACK_VIEW_URL =
  'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/track-view'
const SESSION_KEY = 'sc_analytics_sid'

export function trackClick(eventPath: string) {
  try {
    const sessionKey =
      localStorage.getItem(SESSION_KEY) ??
      'anon-' + Math.random().toString(16).slice(2, 10)
    fetch(TRACK_VIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.location.pathname + window.location.hash + '/' + eventPath,
        referrer: null,
        sessionKey,
        source: 'app',
        timezone:
          (window.Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
      }),
      keepalive: true,
    }).catch(() => {
      /* offline: se omite */
    })
  } catch {
    /* sin fetch/localStorage: se omite */
  }
}
