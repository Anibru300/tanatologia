# Avance 2026-09-04 — Panel de analíticas Admin + fix crítico de escalación de rol

## Contexto
La fundadora no encontraba "el panel" de analíticas porque no existía: lo único activo era GA4 (G-CJ0QQ9JY27), sin acceso a los datos. Se construyó un panel **first-party** propio.

## 1. Analíticas first-party

**Migración 016 (`016_page_views.sql`)** — aplicada en Cloud:
- Tabla `page_views` (page, referrer, session_key, created_at) con índices. RLS: INSERT libre (anon/anyone), SELECT/borrado solo admin. Vista `analytics_page_views` para lectura admin.

**Edge Function `track-view`** (pública, `verify_jwt = false`):
- Única vía de escritura: service role, rate-limit 60/min por IP + por sesión, valida shape del body, sanitiza referrer a origen (anti-inyección). No correo, no PII, no IP, no consentimiento requerido (analytics propia, misma lógica que GA4).

**Beacons**:
- Sitio estático: snippet al final de `assets/js/components.js` (17 páginas lo cargan), sessionStorage para session_key.
- App React (`/app/`): snippet inline en `index.html` con listener de `hashchange` (rutas del HashRouter).

**Panel Admin** (`/admin/analiticas`, `AdminAnalytics.tsx` + `analyticsService.ts`, menú nuevo en `AdminLayout`):
- Visitas por día (sitio vs app), sesiones únicas, páginas más vistas, referrers ("de dónde nos visitan" — Instagram, Google, etc.), dispositivos/navegadores, registros por día (pacientes/profesionales), citas creadas por estado, y rangos 7/30/90 días. GA4 queda como complemento.
- Maneja errores con `Alert` (convención del proyecto, sin `alert()`).

## 2. Fix crítico: escalación de rol en self-signup (migración 017)

**Bug**: `handle_new_user()` tomaba `raw_user_meta_data->>'role'` sin validarlo → cualquiera registrándose por la API con `role: 'admin'` quedaba admin.
**Fix**: self-signup solo permite `patient`/`professional`; cualquier otro valor se degrada a `patient`. Admins solo desde Dashboard Supabase o SQL con service role. (Cualquier rol existente ya registrado NO se degradó.)

## 3. Verificación

- `test-analytics.mjs`: 10/10 (beacon, rate-limit, RLS, vista, sanitización de referrer, limpieza de test).
- Regresiones re-corridas tras 017: auth 15/15, features-013 25/25, security-negative 22/22.
- Producción: beacon retorna 200 con session_key de prueba; panel responde 200.
- **Limpieza**: 0 usuarios de prueba (`total_usuarios=9, de_prueba=0, reales=9`), 0 sesiones/citas/slots/reseñas/notas de test; no se tocaron los 9 usuarios reales.

## Decisiones y lecciones

- Sin cookies, fingerprinting ni IP: primer-party mínimo y suficiente para las preguntas de la fundadora (tráfico, origen, registro).
- Quirk confirmado: PostgREST `?col=eq.false` devuelve vacío en booleanos falsos → usar `is.false`.
- El panel no sustituye a GA4 (aún útil para comportamiento de sesión); solo da la visión directa dentro del admin.
