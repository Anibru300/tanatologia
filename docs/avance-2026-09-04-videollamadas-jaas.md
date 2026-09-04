# Avance 2026-09-04 — Videollamadas: límite de 5 min de meet.jit.si + migración JaaS lista

## Diagnóstico (reportado por la fundadora)
- Las videollamadas morían a los 5 min con el aviso "solo es una demostración".
- Causa: **meet.jit.si (gratuito) limita las sesiones embebidas a 5 minutos** (política
  2025-26 de 8x8 para forzar la migración a JaaS). No es un bug nuestro.
- Calidad pixelada: el servidor público es compartido/saturado y decide la calidad por
  adaptación de banda; además no configurábamos resolución (usaba el default).

## Solución implementada ( compatible hacia atrás )
1. **Edge Function `jaas-token`** (desplegada): firma un JWT RS256 de JaaS para la sala
   de una cita. Solo el paciente o el profesional de la cita lo obtienen (RLS);
   el profesional entra como `moderator`. Validaciones: sesión (401), appointmentId
   (400), cita ajena (404), cita no activa (409). **Sin secrets configurados → 501**
   y el frontend sigue con meet.jit.si (fallback automático).
2. **Frontend**: `VideoCallExperience` pide el token al montar (si hay `appointmentId`)
   y pasa `jwt/appId` a `JitsiMeetingRoom`, que renderiza `JaaSMeeting` del SDK
   (o `JitsiMeeting` con meet.jit.si si no hay token). El respaldo "abrir en pestaña
   nueva" incluye el JWT.
3. **Calidad**: config 720p ideal (máx 1080p) + `maxFullResolutionParticipantCount: 2`
   para sesiones 1:1, en ambos modos (JaaS y meet.jit.si).
4. Sala manual del profesional (sin cita) sigue en meet.jit.si: 5 min, solo pruebas.

## Qué falta (acción del cliente, ~15 min)
1. Crear cuenta gratuita en https://jaas.8x8.vc (25 MAU gratis, minutos ilimitados).
2. En la consola JaaS: generar un **API Key** (par de claves) y descargar la clave privada.
3. Enviarme: **App ID** (`vpaas-magic-cookie-...`), **Key ID (kid)** y la **clave privada PEM**.
4. Con eso: `supabase secrets set JAAS_APP_ID=... JAAS_KID=... JAAS_PRIVATE_KEY=...` y listo:
   las videollamadas quedan sin límite de 5 min, sin login de Google, con marca y mejor calidad.

## Costos cuando crezcan (>25 usuarios activos/mes)
- Plan Basic 300 MAU: $99 USD/mes. Overage: $0.99/MAU. Grabadora: $0.01/min (add-on, desactivada).

## Verificación
- `scripts/test-jaas.mjs`: 10/10 (auth, validación, RLS, cita real con video_link por
  trigger, fallback 501, limpieza). La rama de firma real se activa al poner los secrets.
- Unitarios: 31/31 (nuevos: URL de sala con appId/JWT). Lint 0/0, build OK.

## Notas técnicas
- `@jitsi/react-sdk` 1.4.4: `JaaSMeeting` (appId propio) y `JitsiMeeting` (domain) son
  componentes distintos; el tipado no expone appId en JitsiMeeting.
- El trigger `validate_appointment_within_slot` corre con permisos del invocador:
  los slots solo son visibles si el profesional está `verified` (por eso el test
  verifica al profesional de prueba con el truco de desactivar el trigger 003).
- `Prefer: return=representation` es obligatorio en inserts vía PostgREST si se
  necesita el row creado (sin él, 201 con cuerpo vacío).

---

# Actualización — JaaS ACTIVO (2026-09-04)

- Secrets configurados en Supabase Cloud: `JAAS_APP_ID`, `JAAS_KID`, `JAAS_PRIVATE_KEY`.
- `test-jaas.mjs` ahora verifica la firma RS256 con la clave pública: **18/18**.
- Las videollamadas de citas usan 8x8.vc con JWT por participante (profesional=moderator).
- Pendiente: videollamada real de prueba (2 personas) para confirmar que JaaS acepta el kid.
  Si la sala no abriera, lo primero que se revisa es el Key ID (podría estar truncado:
  el formato completo es `vpaas-magic-cookie-.../<hex>-<NOMBRE_APP>`).
- La clave privada vive solo en los secrets de Supabase; la pública está en el test (es pública).
