# Videollamadas: sala de prueba admin + investigación de calidad de imagen

**Fecha:** 2026-09-08
**Estado:** en curso — pendiente el reporte del diagnóstico de cámara (ver §6) y la decisión final de proveedor.
**Contexto:** las videollamadas de la plataforma se veían pixeladas. Se creó una sala de prueba para el administrador y se investigó la causa. Conclusión intermedia: **no es el proveedor (JaaS ni Daily) — es el pipeline cámara↔navegador en la PC de prueba**.

---

## 1. Sala de prueba de videollamada para admin (hecho, en producción)

Para poder probar videollamadas reales sin crear citas y sin el límite de 5 min de meet.jit.si:

- **Página** `/admin/prueba-videollamada` (menú "Prueba de video"), commit `79062bd`.
- **Edge Function `jaas-token`** ahora acepta `{ testRoom }` alternativo a `appointmentId`: valida formato de sala (regex) y exige `profiles.role='admin'` (403 a otros roles; entra como moderador).
- Frontend: `fetchJaasTestToken()` en `src/lib/jaasService.ts` y prop `fetchToken` opcional en `VideoCallExperience` (debe ser estable con `useCallback`).
- La página muestra estado de JaaS (badge), sala copiable y enlace con JWT (~3 h) para probar desde otro dispositivo.

## 2. Fix CORS crítico en `jaas-token` (hecho)

**Síntoma:** `Access to fetch ... blocked by CORS policy` en producción.
**Causa:** la función no respondía el preflight `OPTIONS` ni ponía headers CORS → **las videollamadas reales caían en silencio al fallback de 5 min desde la migración a JaaS** (la "prueba real de llamada" pendiente nunca pasó por esto).
**Fix:** manejo de OPTIONS + headers (mismo patrón que `admin-contact`, `track-view`, etc.). Commit `7d09329`, función redeplegada.
**Regresión:** `scripts/test-jaas.mjs` ampliado, **22/22** (incluye modo testRoom: 403 paciente/profesional, 400 sala inválida, 401 sin sesión).

## 3. Intentos de mejora de calidad en Jitsi (hechos, sin éxito percibido)

Commits `48f7324` y `a5a6348` en `src/components/video/JitsiMeetingRoom.tsx`:

1. `resolution: 1080` + constraints `height {ideal:1080, max:1080, min:480}` (quitar constraint de `width` — el patrón documentado usa solo height).
2. `maxFullResolutionParticipants: -1` (el nombre anterior `maxFullResolutionParticipantCount` **no existe** en la config y era ignorado).
3. `minHeightForQualityLvl` — **primero suelto en configOverwrite (ignorado por Jitsi)**; corregido anidado dentro de `videoQuality: { 240:'standard', 360:'high' }`.
4. `codecPreferenceOrder: ['H264','VP8','VP9']` (H.264 con aceleración por hardware).

**Resultado:** el usuario reporta que se sigue viendo igual de pixelado.

## 4. Investigación de StreamYard (descartado)

Link recibido (`streamyard.com/teams/...`) = invitación a un equipo de StreamYard. Es un **estudio de live streaming** (broadcast a YouTube/Facebook/LinkedIn), no videollamadas 1:1 embebibles: sin SDK para integrar, orientado a creadores, free limitado a SD con marca de agua, Core $44.99/mes. **No aplica** para las salas de terapia de la plataforma.

## 5. Comparación con Daily.co integrada (hecho, en producción)

Para decidir con evidencia si conviene migrar de proveedor:

- **Edge Function `daily-test-room`** (commit `a3c6460`): crea sala Daily Prebuilt solo para admin; secret `DAILY_API_KEY` (guardado en Supabase secrets el 2026-09-08; key entregado por el cliente, expuesto en chat — **rotar si se quiere ser estricto**). Sin el secret → 501 con instrucciones. Sala expira a las ~3 h.
- **Frontend:** `src/lib/dailyService.ts` + tarjeta "Comparar con Daily.co" en `AdminVideoTest` (iframe fullscreen + "Abrir en pestaña nueva").
- **Nota operativa:** Daily exige tarjeta registrada aunque el plan sea free (error `account-missing-payment-method`) — ya agregada por el cliente. Free: 10,000 min-participante/mes ≈ 100 sesiones de 50 min 1:1. Después $0.004/min.
- **Pruebas:** `scripts/test-daily.mjs` **6/6** (CORS, 401, 403, 405).

## 6. Diagnóstico: la cámara en el navegador (pendiente reporte del cliente)

**Resultado clave:** Daily (stack completamente distinto a Jitsi) **se ve igual de mal** en el navegador de la PC de prueba, mientras WhatsApp Desktop (app nativa, misma PC y cámara) se ve nítido → **el problema es el pipeline cámara↔navegador, no el proveedor**.

Sospechosos:
1. El navegador eligió **otra cámara** (IR de Windows Hello, cámara virtual de OBS/Zoom, cámara del monitor).
2. El driver negocia un **modo de baja resolución** (640×480).
3. Otra app con la cámara abierta forzando modo compatible.

**Diagnóstico implementado** (commit `13a3bc2`): `DeviceCheck` ahora pide 1080p al navegador y muestra la **resolución real negociada + nombre del dispositivo** debajo de "Cámara: lista" en la pantalla "Antes de entrar".

**⏳ Pendiente:** el cliente debe entrar a la Prueba de video (Ctrl+F5) y reportar el texto exacto (p. ej. `640×480 · Integrated IR Camera` vs `1920×1080 · HP HD Camera`).

## 7. Opciones para mañana (según el reporte)

- **Si es cámara equivocada:** elegir la correcta en `chrome://settings/content/camera` (default) y/o en el selector de cámara dentro de la sala (engrane → Dispositivos). Considerar añadir selector de cámara propio en `DeviceCheck` si el problema es común en pacientes.
- **Si es resolución negociada baja:** actualizar driver de la cámara (Device Manager → Cámara → Actualizar driver / buscar driver del fabricante), revisar utilidad de la cámara (Logitech G HUB, Lenovo View, HP etc.), verificar iluminación (el ruido por poca luz se percibe como "pixelado").
- **Si el navegador sí da 1080p y aun así se ve mal en la sala:** revisar aceleración de hardware (`chrome://settings → Sistema → Usar aceleración de hardware`) y comparar en otro navegador (Edge/Firefox) para aislar Chrome.
- **Decisión de proveedor:** si tras arreglar la cámara JaaS se ve bien → quitar tarjeta Daily (o dejarla) y listo. Si Daily se ve mejor → migrar salas reales (estimado 1-2 días: `VideoCallExperience`/`JitsiMeetingRoom` → iframe Daily o Daily React SDK; `jaas-token` → función que cree sala por cita).

## Commits del día

| Commit | Descripción |
|---|---|
| `79062bd` | feat(admin): sala de prueba JaaS sin límite de 5 min |
| `7d09329` | fix(jaas-token): headers CORS + preflight OPTIONS |
| `48f7324` | fix(video): umbral de capa HD (minHeightForQualityLvl suelto — ignorado) |
| `a5a6348` | fix(video): config corregida (videoQuality anidado, 1080p, H264) |
| `a3c6460` | feat(admin): comparar con Daily.co desde la página de prueba |
| `13a3bc2` | feat(video): diagnóstico de resolución/nombre de cámara en DeviceCheck |
