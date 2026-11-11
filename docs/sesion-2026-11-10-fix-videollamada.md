# Sesión 2026-11-10 (noche) — Incidente de videollamada: "colgar" ya no es irreversible + diagnósticos de audio

> Registro completo de la sesión. Resumen vivo en `docs/mesa-de-trabajo.md` (§3) e ítem 21c en `AGENTS.md`.
> Deploy: **v1.9.17-beta.1 en producción** (commit `b1217b5`, workflow run 42966474800 success, bundle `index-C8104QzS.js` verificado sirviendo la versión).

## 1. El caso (reporte de soporte)

**Beatriz Adriana Vázquez Ocampo** <adrianaocampo796@gmail.com> (profesional verificada, perfil `7252d41b-5f2f-48c8-b19f-c889f9952d12`) reportó 10-nov-2026 20:06 CDMX vía "Reportar un problema":

> "No puedo entrar a la sesión. Finalicé la llamada ya que la Px no escuchaba y ya no me da acceso"
> Navegador: iPhone / iOS 18.7 / Safari.

## 2. Reconstrucción de hechos (fuentes: `video_call_events`, `audit_logs`, chat)

Cita `ae034031-9e45-4ebf-8e21-8d9c277821d3`: 10-nov 20:00 CDMX (02:00 UTC), 60 min, sesión 1 de programa `program_4` ("Programa Salud Mental"), paciente Arehime Lizeth Nicolas Hernandez (`f757f736-360a-44d6-9a81-4d87c1a381b8`).

| Hora CDMX | Evento |
|---|---|
| 20:00:05 | ROOM_CREATED (Beatriz abrió la sala desde la app) |
| 20:00:09 | PARTICIPANT_JOINED: Beatriz (moderator) |
| 20:00:54 | PARTICIPANT_JOINED: paciente |
| 20:01:36 | PARTICIPANT_JOINED: paciente (salió y reintentó — estaban arreglando el audio) |
| 20:02:20 | PARTICIPANT_LEFT: paciente |
| **20:03:24** | PARTICIPANT_LEFT: Beatriz → **mismo segundo, `audit_logs` UPDATE status='completed'** (disparó `onHangup`) |
| 20:05:10 | Paciente intentó reentrar → ROOM_DESTROYED (quedó sola; la cita ya bloqueaba el reingreso) |
| 20:06–20:08 | Chat interno: ambas fuera ("sale que mi sesión fue terminada" / "Me pasa lo mismo ya no me da acceso") → **intercambiaron números y la sesión terminó en el WhatsApp personal de la profesional** |

## 3. Causa raíz

1. **Diseño irreversible al colgar:** al colgar, `VideoCallExperience` disparaba `onHangup` → `ProfessionalVideoRoom` marcaba la cita `completed` **al instante, sin confirmación**. Una cita `completed` quedaba bloqueada en UI ("Esta sesión ya no está disponible") y en la Edge Function `jaas-token` (409 `ALLOWED_STATUS = pending|confirmed`). Colgar para reintentar el audio —paso natural de troubleshooting— destruía la sesión para ambos.
2. **El audio en sí no fue determinable:** no existía telemetría alguna de estado de micrófono/cámara por participante.

Fue el **tercer escape de sesión a WhatsApp personal** por problemas de acceso (antes: Lidia Vera 16-oct, Estefanía 22-oct).

## 4. Solución implementada (v1.9.17, migración 038)

### a) Confirmación antes de colgar
- `VideoCallExperience.tsx`: `ConfirmDialog` "¿Finalizar la sesión?" (destructivo; "Finalizar sesión" / "Seguir en la llamada"). Solo cuando hay `onHangup` (lado profesional) y ya se estuvo en la llamada (`joined`).
- `JitsiMeetingRoom.tsx`: `toolbarButtons` **sin `'hangup'`** — se oculta el botón rojo nativo de Jitsi; la única salida es el botón de la app (con confirmación). `onReadyToClose` sigue manejando cierres iniciados por Jitsi (p. ej. sala destruida).

### b) Prórroga de reingreso de 30 minutos
- `src/lib/videoSession.ts`: `REJOIN_GRACE_MINUTES = 30` + `completedRejoinUntil()`. Una cita `completed` admite reingreso hasta **hora de término + 30 min**:
  - `getJoinWindowState()`: `completed` ya no es 'ended' automático; respeta la prórroga. `cancelled`/`no_show` siguen cerrados siempre.
  - `filterUpcomingSessions()`: incluye `completed` dentro de la prórroga.
  - Consumidores que la heredan automáticamente: `PatientVideoRoom`, barra de video del chat (`ConversationThread`/`findChatVideoSession`), "Tus próximas sesiones" del profesional.
- Entrada explícita añadida: botón **Entrar** en `ProfessionalAppointments` y `PatientAppointments` para `completed` dentro de la prórroga.
- `ProfessionalVideoRoom.tsx`: el bloqueo "Esta sesión ya no está disponible" ahora usa `getJoinWindowState` en vez de la lista dura de estados.
- **Edge Function `jaas-token`** (redeployada): acepta `completed` si `now <= scheduled_at + duration + 30 min`; 409 fuera de la ventana.
- `handleHangup` (sala y chat) ya no re-marca si la cita ya está `completed` (defensivo; los triggers de notificación llevan guardia `IS DISTINCT FROM`, así que tampoco habría duplicados).

### c) Rastreo de audio (diagnósticos) — migración 038
- RPC `log_video_diagnostic(p_appointment_id uuid, p_event_type text, p_detail jsonb)`:
  - SECURITY DEFINER, exige `auth.uid()` participante de la cita (paciente o profesional); `event_type` validado por regex `^[a-z][a-z0-9_]{2,39}$`.
  - Inserta en `video_call_events` como `DIAG_<EVENTO>` con `participant_name`/`is_moderator` del llamante, `raw = {source:'client', detail}`.
  - **Ojo operativo:** Supabase concede EXECUTE por default a `anon`/`authenticated`/`service_role` — el migration incluye `REVOKE ... FROM anon` explícito (`REVOKE FROM PUBLIC` NO basta).
- `JitsiMeetingRoom` expone `onDiagnostic`; `VideoCallExperience` (solo con `appointmentId`) reporta best-effort: `joined`, `left`, `audio_muted`, `audio_unmuted`, `video_muted`, `video_unmuted` (eventos `videoConferenceJoined/Left`, `audioMuteStatusChanged`, `videoMuteStatusChanged` de la Iframe API).
- `getCallFacts` (panel admin `/admin/citas`) ignora los `DIAG_*` para participantes/duración real.

**Cómo rastrear un problema de audio después de ahora:**
```sql
SELECT occurred_at, event_type, participant_name, is_moderator, raw
FROM video_call_events
WHERE appointment_id = '<uuid>'
ORDER BY occurred_at;
-- Los DIAG_AUDIO_MUTED / DIAG_AUDIO_UNMUTED dicen quién silenció o activó su
-- micrófono y cuándo (la causa #1 de "no me escucha").
```

## 5. Verificación

- **Vitest:** 45/45 (7 archivos), incluidos los nuevos casos de `videoSession` (completed dentro/fuera de prórroga; `filterUpcomingSessions` incluye completed recién terminada).
- **Lint:** oxlint 0 errores (4 warnings preexistentes). **Build:** OK.
- **E2E Cloud** `scripts/test-jaas.mjs` ampliado: **32/32** — reingreso dentro de prórroga → 200, fuera → 409; RPC: participante → 204 + fila `DIAG_AUDIO_MUTED` verificada en BD, cita ajena → 400, event_type inválido → 400. Cleanup: 0 usuarios de prueba.
  - Lección: tras `supabase functions deploy`, esperar ~1 min antes de correr el E2E (la propagación de Deno Deploy hizo fallar 1 caso en el primer run 31/32; al repetir: 32/32).
- **Deploy:** push `b1217b5` → workflow success → https://somos-calma.com/app/ sirve bundle con `1.9.17-beta.1`.

## 6. Pendientes / decisiones del dueño

1. ✅ **Respuesta a Beatriz enviada** por el dueño desde la Bandeja (10-nov noche); borrador en `docs/borrador-respuesta-beatriz-2026-11-10.md`.
2. ✅ **Decisión de negocio (10-nov noche): la sesión 1 del programa SÍ cuenta como consumida.** La profesional puede dar reposición publicando un slot en Disponibilidad y pidiendo a la paciente agendar por el chat (queda dentro del `program_4` según el conteo vigente).
3. **Vigilar los primeros `DIAG_*` reales** en producción para confirmar que el logging funciona con tráfico real (la próxima cita con videollamada). Chequeo rápido tras cada sesión:
   ```sql
   SELECT occurred_at, event_type, participant_name FROM video_call_events
   WHERE appointment_id = '<uuid de la cita>' ORDER BY occurred_at;
   ```
   (En `/admin/citas` la columna Videollamada sigue igual; los `DIAG_*` se consultan por SQL.) Ojo: si una sesión se cae o hay reporte de audio, ésta es la primer fuente de diagnóstico.
4. (Pospuesto, no pedido) Mostrar los diagnósticos de audio de forma amigable en `/admin/citas`; hoy solo se consultan por SQL.

## 7. Archivos tocados

- `platform/web/src/lib/videoSession.ts` (+ `.test.ts`) — prórroga de reingreso.
- `platform/web/src/components/video/VideoCallExperience.tsx` — ConfirmDialog + reporter de diagnósticos.
- `platform/web/src/components/video/JitsiMeetingRoom.tsx` — sin hangup nativo + listeners de diagnóstico.
- `platform/web/src/features/professional/pages/ProfessionalVideoRoom.tsx` — bloqueo por ventana; guardia de re-marca.
- `platform/web/src/features/professional/pages/ProfessionalAppointments.tsx` — Entrar en prórroga.
- `platform/web/src/features/patient/pages/PatientAppointments.tsx` — Entrar en prórroga.
- `platform/web/src/features/messages/ConversationThread.tsx` — guardia de re-marca.
- `platform/web/src/features/admin/adminService.ts` — `getCallFacts` ignora `DIAG_*`.
- `platform/supabase/supabase/functions/jaas-token/index.ts` — completed dentro de prórroga (redeploy).
- `platform/supabase/migrations/038_video_rejoin_grace.sql` — RPC de diagnósticos (aplicada en Cloud).
- `platform/web/scripts/test-jaas.mjs` — casos nuevos (22 → 32 checks).
- `platform/web/package.json` — 1.9.16 → 1.9.17.
