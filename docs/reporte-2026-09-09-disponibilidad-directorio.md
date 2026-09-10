# Reporte de sesión 2026-09-09 — Fix disponibilidad "traslape fantasma" y limpieza del directorio

## Contexto

Durante la operación Beta 1.0 llegaron dos reportes:

1. Una profesionista intentaba agregar un horario de disponibilidad y recibía
   *"Ese horario se traslapa con otro que ya tienes registrado"*, pese a que su
   calendario no mostraba ningún horario. Envió captura de consola: dos errores
   `400` en `GET /rest/v1/availability_slots?select=*`.
2. En el directorio público aparecía una card genérica: nombre "Profesional",
   especialidad "Acompañamiento emocional", bio "Especialista en acompañamiento
   emocional y tanatología." — se sospechaba cuenta de prueba/falsa, y el conteo
   no cuadraba: 10 profesionales visibles vs 9 expedientes reales en admin.

## Hallazgo 1 — Traslape fantasma en disponibilidad (CAUSADO Y RESUELTO)

### Diagnóstico (verificado contra producción)

- El listado del portal del profesional (`getMyAvailability` en
  `platform/web/src/features/availability/availabilityService.ts`) solo trae
  slots **futuros**: filtro `slot_start >= now`.
- Los slots **nunca se eliminan** al vencer, y la constraint EXCLUDE
  `availability_slots_no_overlap` (migración 008) bloquea inserts contra
  **todas** las filas, incluidas las vencidas e invisibles.
- Resultado: una profesional con slots vencidos ve el calendario vacío ("no
  tengo horarios") pero al re-agendar una hora que traslapa, el INSERT se
  rechaza con 409/23P01 → mensaje amigable "se traslapa con otro registrado".
- Evidencia en datos: había **12 slots vencidos** en `availability_slots`.
  La profesional con el patrón exacto del reporte fue **Ma. Guadalupe Muñoz
  Campuzano** (última cuenta con slots creados ~2-3 min antes de su hora,
  2026-09-09 ~21:05 hrs local, consistente con una prueba en vivo).
- Los `400` de la consola corresponden al GET del listado fallando de forma
  transitoria (probablemente recarga del caché de esquema de PostgREST durante
  actividad de DDL/funciones esa noche). Verificado con curl: el mismo GET
  responde **200** ahora, incluso sin autenticar. Efecto secundario: cuando el
  GET fallaba, la página mostraba un calendario vacío sin dejar claro que la
  **carga** había fallado, lo que alimentó la confusión.

### Solución aplicada

- **Migración 024** (`platform/supabase/migrations/024_purge_expired_availability_slots.sql`),
  ya aplicada en Cloud:
  1. Purga inmediata de slots vencidos (se eliminaron 12; las citas ya
     agendadas viven en `appointments` y no referencian el slot — seguro).
  2. Purgas automática horaria vía pg_cron: job `purge-expired-availability-slots`
     (`23 * * * *`, `DELETE ... WHERE slot_end < now()`), verificado activo
     (`cron.job`, jobid 3).
- **Frontend** (`platform/web/`, build OK, 31/31 tests):
  - Mensaje claro si la carga falla: "No se pudo cargar tu disponibilidad (…).
    Recarga la página e intenta de nuevo." (antes parecía calendario vacío).
  - Al rechazar por traslape se refresca la lista para mostrar el horario
    conflictivo visible (`isOverlapError` + refetch en `ProfessionalAvailability`).
  - `friendlyError` ahora también detecta el código SQLSTATE `23P01` (no solo
    el nombre de la constraint en el mensaje).

### Pendiente de este hallazgo

- **Commit + push del frontend** para desplegar a `/app` (los cambios están en
  disco local; la migración 024 ya está en Cloud y opera sola).
- Confirmar con Ma. Guadalupe Muñoz Campuzano que ya puede agendar sin el
  error (sus bloqueos vencidos ya fueron purgados).

## Hallazgo 2 — Card "Profesional" en el directorio (RESUELTO)

### Diagnóstico

- No era una cuenta fake: era la **cuenta de prueba del propio administrador**
  ("Carlos Urbina", `ing.carlosurbina@gmail.com`), verificada y visible, pero
  con el perfil profesional sin completar (`professional_profiles.full_name`
  NULL, `bio` NULL, `specialties` []) — su nombre real vive en `profiles`.
- El directorio (`TherapistDirectory.tsx` + `appointmentsService.ts`) muestra
  fallbacks cuando faltan datos: nombre → "Profesional", especialidad →
  "Acompañamiento emocional", bio → "Especialista en acompañamiento emocional
  y tanatología." (texto exacto del reporte).
- Esto también explicaba el conteo: 10 verificados+visibles = 9 reales + la
  cuenta de prueba. Los otros 18 registros con perfil vacío son cuentas
  `pending` e invisibles (normales, no aparecen en el directorio).

### Solución aplicada

- `is_visible = false` en la cuenta de prueba (respetando el trigger
  `enforce_professional_profile_update_restrictions`, con JWT simulado del
  admin). Directorio: **9 profesionales reales** = 9 expedientes.
- La cuenta sigue **100% usable** para pruebas como profesionista (portal
  completo: disponibilidad, agenda, videollamadas, notas, mensajes).
  Única limitación: un paciente no puede ver sus slots ni agendar con él
  (RLS exige `verified + visible`). Si en el futuro se necesita probar el
  booking de punta a punta, completar el perfil y reactivar visibilidad.

## Hallazgo 3 — Cuenta duplicada (PENDIENTE DE DECISIÓN)

**Victor Hugo Benítez Méndez** tiene dos cuentas con correos distintos:
`psicoatencion.sma@gmail.com` (verificada, visible, 10 slots) y
`psicoatencionsma@gmail.com` (pending, invisible, 2 slots vencidos). No causó
este incidente, pero puede generar confusión operativa. Decidir: eliminar la
secundaria o mantenerla a petición del profesional.

## Pendientes para la siguiente sesión

1. **Desplegar el fix de disponibilidad**: commit + push de los cambios del
   frontend (auto-deploy a `/app` vía GitHub Actions).
2. **Nueva funcionalidad (solicitada): sección de rastreo de errores en el
   panel admin** — agregada al backlog (`docs/backlog-post-beta.md` ítem 9):
   captura de errores del lado del cliente (excepciones no capturadas,
   promesas rechazadas, fallos de red a Supabase) vía Edge Function
   autenticada + tabla `client_error_logs`, y página admin tipo "logs" con
   filtros por rol (paciente/profesionista), página y fecha; sanitizado para no
   guardar datos personales ni tokens. Objetivo: detectar fallas reales de
   usuarios sin depender de que copien la consola a mano.
3. Decidir qué hacer con la cuenta duplicada de Victor Hugo Benítez.
4. Dar seguimiento al reporte de Ma. Guadalupe (confirmación de la
   profesional).
5. (Recordatorio operativo) Prueba real de videollamada JaaS y verificación del
   `JAAS_KID` con el cliente — pendiente pre-existente.

## Referencias

- Migración: `platform/supabase/migrations/024_purge_expired_availability_slots.sql`
- Frontend: `platform/web/src/features/availability/availabilityService.ts`,
  `platform/web/src/features/professional/pages/ProfessionalAvailability.tsx`
- Backlog: `docs/backlog-post-beta.md` (ítem 9, observabilidad)
- Actualización de estado del proyecto: `AGENTS.md` (ítem 16)
