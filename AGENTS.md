# AGENTS.md — SOMOS-CALMA

## Contexto del proyecto
Plataforma de acompañamiento emocional y tanatología en México. Actualmente en fase beta/MVP.

## Ubicación del código fuente
- Nuevo stack React: `platform/web/`
- Migraciones Supabase: `platform/supabase/migrations/`
- Sitio estático legacy: raíz del repo (`index.html`, `assets/`, `pages/`)
- Fotos y videos de las fundadoras: `assets/images/fundadoras/` (lupita.jpg, edith.jpg, bienvenida.mp4, edith.mp4)
- Material original fuera del sitio (no publicado): `recursos/` (`fotos-pagina/`, `fundadoras/`, `videos/`)

## Stack
- React 19 + Vite 8 + TypeScript 6
- Vitest para pruebas unitarias (`npm run test` → se ejecuta vía `npx vitest@^3`, sin dependencia instalada; para fijarlo en el lockfile, corre `npm i -D vitest` en tu disco local una sola vez)
- Tailwind CSS 3
- React Router DOM 7
- Lucide React (iconos)
- Supabase Auth + PostgreSQL + Edge Functions (conectado a proyecto cloud)
- Jitsi Meet vía `VITE_JITSI_DOMAIN` (por defecto meet.jit.si; preparado para migrar a JaaS/8x8.vc)
- Resend (pendiente de API key)

## Cómo ejecutar
```bash
cd platform/web
npm install   # solo en disco local, evitar Google Drive/OneDrive
npm run build # debe pasar sin errores
npm run dev   # servidor local
```

## Configuración de Supabase
1. Crear un proyecto en https://supabase.com.
2. Copiar `Project URL` y `anon public key` desde **Project Settings > API**.
3. Crear `platform/web/.env` a partir de `.env.example` y pegar esos valores.
4. Ejecutar `platform/supabase/migrations/001_initial_schema.sql` en el **SQL Editor** del proyecto.
5. (Opcional) Crear usuarios demo con el service role key:
   ```bash
   cd platform/web
   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-demo.mjs
   ```
   El `service role key` nunca debe subirse al frontend ni al repositorio.

## Notas ACID
La migración está diseñada para aprovechar las garantías ACID de PostgreSQL:
- **Atomicidad:** el registro de usuario y la creación de perfil ocurren en la misma transacción mediante un trigger en `auth.users`.
- **Consistencia:** constraints (`CHECK`, `NOT NULL`, `UNIQUE`, `FOREIGN KEY`) y RLS validan estados válidos.
- **Aislamiento:** PostgreSQL gestiona concurrencia con MVCC.
- **Durabilidad:** los commits persisten en el almacenamiento de Supabase Cloud.

## Convenciones
- Path alias `@/` apunta a `platform/web/src/`.
- Componentes UI en `src/components/ui/`: Button, LinkButton, Card, Input, Select, Textarea, Badge, Stepper, ProgressBar, **Modal, ConfirmDialog, Alert, EmptyState, Skeleton, DataTable, Logo** (creados en la revisión UX 2026-07-29; usarlos en vez de improvisar banners, modales, tablas o estados vacíos).
- Los 3 portales usan el layout unificado `src/app/layouts/PortalLayout.tsx` (los layouts por rol solo definen `menuItems`; badge "Pronto" para secciones ComingSoon; `matchPaths` para subrutas como `/sala`). `QuickExitButton` solo en el portal paciente.
- Páginas en `src/features/{rol}/pages/`. Roles: `patient`, `professional`, `admin`.
- Paleta con variantes `-dark`/`-darker` (contraste WCAG AA): texto blanco solo sobre `*-dark`. Radios como tokens (`rounded-xs/sm/md/DEFAULT/lg/xl`), sin valores arbitrarios.
- Prohibidos `alert()`/`window.confirm`/`window.prompt`: usar `ConfirmDialog`/`Modal`. Errores siempre visibles con `Alert` (nunca solo `console.error`).

## Cuentas demo
- (Eliminadas 2026-07-29: la plataforma ya opera con usuarios reales. El script `scripts/seed-demo.mjs` se conserva solo como referencia.)

## Pendientes críticos
0. ✅ **(RESUELTO 2026-09-03) El proyecto Supabase Cloud `qjwebikgrqtotqfipeqt` volvió a resolver en DNS** y respondió correctamente. Las credenciales existentes (.env, secrets de GitHub Actions, `index.html`) siguen siendo válidas — no hizo falta rotarlas.
0b. ✅ **Migraciones 010 y 011 aplicadas en Cloud (2026-09-03)** vía `supabase db query --linked` (tabla `feedback` operativa; triggers `audit_*` y `set_feedback_role_trigger` verificados en `pg_trigger` y escribiendo en `audit_logs`). Edge Function `contact-form` redeplegada con rate-limit por IP.
0c. ✅ **Pruebas E2E ejecutadas (2026-09-03):** `node scripts/test-auth-flow.mjs` → 15/15 (auth, RLS, anti-escalación de role, anti-auto-verificación). `node scripts/test-core-flows.mjs` (nuevo: Bloques 3–6 y 10; requiere cuentas `e2e-core-*@test.somos-calma.com` y profesional verificado vía SQL — ver instrucciones en el header del script) → 22/22 (slots EXCLUDE, booking íntegro, doble-reserva rechazada, `get_booked_slots`, notificaciones de agenda/cancelación, notas clínicas con RLS, feedback, contact-form). Usuarios de prueba eliminados (`DELETE FROM auth.users ...`).
1. ✅ Autenticación conectada a Supabase Auth; `MOCK_USERS` eliminado.
2. ✅ Migración SQL ACID ejecutada en proyecto Supabase Cloud.
3. ✅ Integrar Jitsi Meet en `ProfessionalVideoRoom` y sala de paciente (usando `meet.jit.si`).
4. ✅ Citas conectadas a Supabase (agendar, listar, videollamada real).
5. ✅ Edge Function `send-email` activa con Resend (2026-07-31). Reescrita sin `@supabase/server` (ese wrapper rechazaba credenciales válidas con INVALID_CREDENTIALS); ahora es `Deno.serve` + `createClient` con el header Authorization del request. `verify_jwt = false` en el gateway (config.toml) y la función valida usuario + rol internamente. Correos con plantilla de marca (`src/lib/emailTemplate.ts`) para citas y cotizaciones.
5b. ✅ (2026-07-31) SMTP de autenticación migrado a **Resend** (`smtp.resend.com`, remitente `hola@somos-calma.com`); plantilla de *Reset Password* personalizada con flujo `token_hash` → `#/actualizar-contrasena` (compatible con HashRouter; `UpdatePasswordPage` usa `verifyOtp`). Dominio verificado en Resend con DKIM/SPF/DMARC en DNS de Hostinger.
6. ✅ Fase 1 (2026-07-27): perfiles editables con avatar (Supabase Storage), verificación documental de profesionistas + panel admin `/admin/verificacion`, disponibilidad real conectada al booking (RPC `get_booked_slots`), notificaciones in-app con Realtime, CI/CD con GitHub Actions.
7. ✅ Migraciones 005 y 006 aplicadas en Supabase Cloud (tablas `professional_documents`, `notifications`, `legal_acceptances`, `platform_settings`, buckets `avatars` y `professional-documents`).
7b. ✅ Migración 007 aplicada en Cloud (política UPDATE de `patient_profiles`, `is_assigned_patient()` SECURITY DEFINER, validación estricta de docs en `submit_for_review`). **Ninguna migración pendiente.**
7c. ✅ Dashboards admin/profesional/paciente con datos reales (sin mocks); historial del paciente, lista de pacientes y notas clínicas (`clinical_notes`) conectados a Supabase. Campana de notificaciones arriba a la derecha en los 3 portales.
7d. ✅ Migración 008 (`008_date_specific_availability.sql`) aplicada en Cloud (verificado 2026-07-29 vía API: `availability_slots` activa con EXCLUDE anti-traslape, tabla `availability` eliminada, RPC `get_booked_slots(p_professional_profile_id, p_start, p_end)` operativa). **Ninguna migración pendiente.**
7e. ✅ Flujos probados end-to-end contra Cloud (2026-07-29): cancelación de cita (slot se libera en `get_booked_slots` + trigger `notify_appointment_events` crea notificación al paciente), notas clínicas (profesional escribe en su cita; trigger `validate_clinical_note` rechaza citas ajenas; paciente no las ve por RLS), notificaciones in-app y registro inmediato (Confirm email desactivado).
7f. ✅ (2026-08-02) Auditoría integral (`docs/auditoria-2026-08-02.md`) corregida: formulario de contacto migrado de Formspree (estaba roto, 404) a la Edge Function pública **`contact-form`** (Resend → hola@somos-calma.com, honeypot anti-spam; desplegada vía CLI `supabase functions deploy contact-form`).
7g. ✅ Migración 009 (`009_booking_integrity.sql`) aplicada en Cloud vía `supabase db query --linked`: constraint EXCLUDE `appointments_no_overlap` (anti doble-reserva con función IMMUTABLE `appointment_range()`) + trigger `validate_appointment_within_slot` (toda cita debe caber en un `availability_slot` publicado). **Ninguna migración pendiente.**
7h. ✅ Portal demo estático (`pages/profesionales/{dashboard,agenda,aula,biblioteca,soporte}.html`) retirado: redirige a `/app/#/login` (tenía datos ficticios y formularios falsos). Testimonios ficticios del index reemplazados por sección "Nuestro compromiso". Legales actualizados a persona física (sin S.A.P.I.; domicilio genérico "Ciudad de México, México" mientras no haya fiscal). Correos unificados a hola@somos-calma.com (era un Outlook personal).
8. ✅ Secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configurados en GitHub Actions; deploy automático verificado (build de `/app` con la URL de Supabase embebida).
8b. Supabase CLI vinculada al proyecto cloud (`supabase link --project-ref qjwebikgrqtotqfipeqt`); permite desplegar funciones y ejecutar SQL remoto (`supabase db query --linked -f <migracion>.sql`).
9. Implementar pagos cuando haya tracción. **Requisito del cliente (2026-08-02):** el sistema debe ofrecer varias opciones — **tarjeta de débito/crédito (Visa/Mastercard), PayPal y transferencia bancaria (SPEI)**. Openpay cubre tarjeta + SPEI (ver `docs/investigacion-plataforma-2026-07-27.md`); PayPal requiere integración aparte (cuenta Business; opción rápida: link PayPal.Me). Mientras tanto, el sitio lo anuncia como "próximamente".

10. ✅ **Buzón de hola@somos-calma.com operativo (2026-09-06):** el cliente compró el correo en Hostinger; MX (`mx1/mx2.hostinger.com`), SPF de Hostinger, DKIM `hostingermail-*` y DMARC (`p=none`) activos en DNS. Al aplicar los registros de Hostinger se perdió el DKIM de Resend (`resend._domainkey`) y se restauró (verificado en el dashboard de Resend). El secret `CONTACT_INBOX` de `contact-form` volvió a `hola@somos-calma.com`, función redeplegada y prueba de envío 200 `{"ok":true}`. El webmail de Hostinger permite enviar como hola@somos-calma.com sin conflicto con Resend (SPF de Hostinger en la raíz; Resend usa el subdominio `send`). Fin del Plan B (outlook.com).

11. ✅ (2026-08-16) Calidad de código: Vitest configurado (vía npx, sin tocar el lockfile) con tests de la lógica crítica de videollamadas (`src/lib/videoSession.ts`, `video.ts`, `utils.ts`); el CI propuesto corre **lint + tests + build** en cada push y en cada PR (ver `docs/deploy-app.propuesto.yml`; copiar sobre `.github/workflows/deploy-app.yml` para activarlo — el token de automatización no tiene permiso `workflow`). Dependabot activo (npm + GitHub Actions, semanal).
12. ✅ (2026-08-16) Videollamadas pulidas: chequeo previo de cámara/micrófono con instrucciones en español (`DeviceCheck`), ventana de acceso por cita (paciente entra 15 min antes y hasta 15 min después de que termina; fuera de ventana ve conteo regresivo o aviso de sesión terminada), experiencia compartida `VideoCallExperience`, Jitsi en español con `disableDeepLinking` (evita el salto a la app en móvil) y pantalla de error con opción de abrir la sala en pestaña nueva si el iframe es bloqueado.
13. ✅ **(2026-09-06) Correos transaccionales automáticos + Comunicados (migraciones 019/020):** triggers en `profiles` (bienvenida por rol), `appointments` (cancelación avisa por correo a paciente Y profesional) y `professional_profiles` (verificación aprobada/rechazada con motivo) → `dispatch_user_email()` despacha vía pg_net a la Edge Function interna `user-emails` (plantilla de marca, best-effort: un fallo de correo nunca tumba la operación). **Fix 020:** `CRON_SECRET` nunca estuvo en vault (está hardcodeado en `cron.job` y como Edge Function secret); el SELECT a vault devolvía NULL y la función salía en silencio. Panel admin **Comunicados** (`/admin/comunicados`, `AdminBroadcasts` + Edge Function `send-broadcast`): envío masivo a todos/pacientes/profesionales con historial y contadores (`email_broadcasts`, RLS admin). Funciones `user-emails` y `send-broadcast`: `verify_jwt=false` en config.toml; `user-emails` se autentica con header `x-cron-secret`, `send-broadcast` valida JWT de admin internamente.
14. ✅ **(2026-09-04) Videollamadas en JaaS (8x8.vc)** — migración hecha y activa: meet.jit.si limitaba las sesiones embebidas a 5 min; la Edge Function `jaas-token` firma un JWT RS256 por cita (solo participantes, profesional=moderator; secrets `JAAS_APP_ID`/`JAAS_KID`/`JAAS_PRIVATE_KEY` en Supabase) y `JitsiMeetingRoom` usa `JaaSMeeting` del SDK con fallback automático a meet.jit.si si no hay token (sala manual del profesional). Calidad 720p configurada. Gratis hasta 25 MAU; después plan $99/300 MAU. Test: `scripts/test-jaas.mjs` 18/18 (verifica firma con clave pública). Pendiente solo: prueba real de llamada. Plan futuro si el volumen lo justifica: servidor Jitsi propio.

## Modelo de disponibilidad (2026-07-29)
- El profesional publica **slots de fecha/hora específicos** desde un calendario (`/profesional/disponibilidad`); cada slot = sesión de 50 min (`availability_slots`, constraint EXCLUDE anti-traslape).
- El paciente agenda sobre slots libres (mini-calendario en `BookAppointment`); si viene del directorio, el terapeuta ya va preseleccionado (state de navegación `therapistId`).
- Salas de video (`PatientVideoRoom`, `ProfessionalVideoRoom`) renderizan Jitsi en **overlay a viewport completo** (`fixed inset-0 z-[60]`); el menú "Videollamada" del profesional lista sus próximas citas para entrar con un clic.

## Despliegue
- Dominio propio: **https://somos-calma.com** (comprado en Hostinger 2026-07-31). El archivo `CNAME` en la raíz lo vincula a GitHub Pages.
- GitHub Pages publica la rama `main` (sitio estático original en raíz).
- La plataforma React compilada se encuentra en `/app/`.
- Base URL configurada en `platform/web/vite.config.ts` como `/app/`.
- Se usa `HashRouter` para evitar errores 404 en rutas de SPA en GitHub Pages.
- El archivo `/app/404.html` redirige cualquier ruta desconocida al hash correspondiente (`/#/ruta`).
- El workflow `.github/workflows/deploy-app.yml` compila `platform/web` y copia el build a `/app/` automáticamente en cada push a `main` que toque `platform/web/**` (requiere los secrets de Supabase configurados).
- En Supabase Dashboard (Authentication > URL Configuration) deben estar `https://somos-calma.com/app/` como Site URL y redirect URL.

## Analytics
- **Google Analytics 4** (`G-CJ0QQ9JY27`) integrado 2026-07-31: sitio estático vía `assets/js/components.js` (cargado en las 16 páginas) y app React vía `platform/web/index.html` con `page_view` en cada `hashchange` del HashRouter.
- Search Console: propiedad de dominio verificada (2026-07-31).

## Registro de nuevos usuarios
- Al registrarse, el trigger `handle_new_user()` crea automáticamente el perfil en `profiles` y, según el rol, un registro en `patient_profiles` o `professional_profiles`.
- Si deseas que el registro sea inmediato (sin confirmar correo), desactiva **Confirm email** en:
  **Supabase Dashboard > Authentication > Providers > Email > Confirm email**.
- Para aplicar el trigger actualizado con subperfiles, ejecuta en el SQL Editor:
  `platform/supabase/migrations/002_update_trigger_subprofiles.sql`.

## Modo Beta gratuita (2026-09-02) → **Beta 1.0 en operación (2026-09-03)**
- La plataforma opera en **Beta 1.0** (`platform/web/package.json` = `1.0.0-beta.1`), en modo **operación y validación con usuarios reales**: estabilidad → observabilidad → feedback → corrección. **No agregar funcionalidades nuevas por iniciativa propia.**
- Documento operativo: `BETA-OPERATIONS.md` (checklists, prioridades P0–P3, reglas de deploy y smoke test, observaciones externas: correo Hostinger Plan B y meet.jit.si).
- Backlog deliberadamente pospuesto: `docs/backlog-post-beta.md` (8 ítems + monetización diferida).
- Auditoría de release: `docs/auditoria-pre-beta-2026-09-03.md` (0 críticos, 0 importantes, 84+ pruebas).
- La plataforma opera en **Beta gratuita**: ningún precio, pago, membresía o cotización debe ser visible ni bloquear flujos.
- Qué se eliminó y qué quedó reservado para monetización futura está documentado en `docs/beta-monetizacion-diferida.md` (incl. rutas retiradas y páginas admin conservadas sin menú).
- `siteConfig.pricing` (app y sitio) queda como fuente central reservada — no añadir consumidores en UI durante la Beta.
- Legales (terminos/cancelacion/aviso-privacidad) ✅ actualizados 2026-09-03 a versión "sin pagos" para la Beta: sin membresías/cargos/reembolsos vigentes; pagos futuros solo con aviso de 30 días y consentimiento expreso.

## Analíticas (panel Admin “Flujo de la página”, 2026-09-04)
- **First-party**: tabla `page_views` (migración 016) alimentada por la Edge Function pública `track-view` (rate-limit 60/min por IP y por sesión; único escritor, service role; referrer sanitizado a origen; **timezone IANA** desde migración 018). Beacons en `assets/js/components.js` (sitio, 17 páginas) y `platform/web/index.html` (app, por hashchange). Lectura/borrado solo admin (RLS).
- **Geografía sin IP**: `profiles.timezone` y `page_views.timezone` guardan la zona horaria del navegador (enviada en el registro y en cada beacon); el mapeo a país/ciudad es en el frontend (`src/lib/timezoneGeo.ts`). Registros anteriores al 04-sep-2026 aparecen como “Desconocido”.
- **Panel**: `/admin/analiticas` (menú “Flujo de la página”) — gráfica de área de visitas/día (sitio vs app), donas de referrers/países/dispositivos, tendencia vs período anterior en KPIs, embudo visitas→registros→citas, registros por país/ciudad, páginas top, navegadores. GA4 (G-CJ0QQ9JY27) sigue activo como complemento.
- **Pruebas**: `scripts/test-analytics.mjs` (13/13; requiere `ADMIN_PASSWORD=demo123` para la parte admin).
- Migraciones 013–018 aplicadas en Cloud (recordatorios/intake/reseñas, fixes 014/015, page_views 016, fix rol 017, timezone 018). **Ninguna migración pendiente.**

## Seguridad
- **Fix crítico (migración 017)**: el trigger `handle_new_user()` aceptaba `role: 'admin'`/`'support'` desde el metadata del signup (escalación de privilegios vía API). Ahora el self-signup solo permite patient/professional; cualquier otro valor se degrada a patient. Los admins se crean solo desde el Dashboard de Supabase o SQL con service role.

## Funciones de la Beta 1.1 (2026-09-02) — recordatorios, encuesta de registro y reseñas
- **Recordatorios de cita:** Edge Function `appointment-reminders` (pg_cron cada 10 min vía `net.http_post` con header `x-cron-secret`; secreto `CRON_SECRET` en vault). Envía email (Resend) 24 h y 15 min antes a paciente y profesional con botón de sala y enlace a Google Calendar, e inserta notificación in-app (`type=appointment_reminder`). Banderas `appointments.reminder_24h_sent`/`reminder_15m_sent` con claim atómico. **WhatsApp:** requiere WhatsApp Business API (Meta/Twilio, de pago) → pendiente de decisión del cliente (ver `docs/encuesta-matching-investigacion.md` §4).
- **Encuesta de registro (intake):** `patient_profiles.intake` (JSONB) + `intake_completed_at`. Wizard en `/paciente/encuesta` (se ofrece tras el registro y desde el banner del dashboard). Bloque A filtra el directorio (nivel de necesidad → `specialties[]` del profesional); Bloque B = tamizaje OPCIONAL PHQ-9 + GAD-7 (instrumentos validados, dominio público; ítem 9 del PHQ-9 > 0 muestra tarjeta de crisis). Investigación: `docs/encuesta-matching-investigacion.md`.
- **Reseñas:** `professional_reviews` (paciente → profesional, una por cita completada; vista pública anónima `professional_reviews_public`, sin `patient_profile_id`, solo authenticated). `patient_reviews` (profesional → paciente, privada: solo colegas con cita con ese paciente + admin). Rating agregado en `*_profiles.rating/rating_count` por triggers (013). UI: `RatingDialog` + `StarRating` (`src/features/reviews/`), botones "Calificar" en citas completadas; directorio muestra bio, formación (`education`, editable en perfil profesional), idiomas, experiencia, enfoque y reseñas.
- **Migraciones aplicadas en Cloud:** 013 (intake/reviews/reminder flags), 014 (exime el rating agregado del trigger 003 con `pg_trigger_depth() > 1`; revoca anon en la vista pública), 015 (service role con `auth.uid() IS NULL` pasa el trigger de citas 005 — necesario para las banderas de recordatorio). Pruebas: `platform/web/scripts/test-features-013.mjs` (25/25) + regresión auth (15/15) y seguridad (22/22).

## Feedback de la Beta (2026-09-02)
- Tabla `feedback` (migración 010): tipo (`general|suggestion|issue|praise`), rating 1–5, comentario ≤2000, estado (`new|in_review|resolved|dismissed`), notas de admin. RLS: propio + admin total; DELETE propio solo en `new`.
- UI: `FeedbackForm`/`FeedbackList` compartidos (`src/features/feedback/`); páginas `/paciente/feedback`, `/profesional/feedback` y `/admin/feedback` (filtros rol/tipo/estado/fecha, cambio de estado con notas).
- El `role` de cada feedback lo fija el trigger `set_feedback_role()` desde `profiles` — nunca desde el cliente.

## Verificación de profesionistas (Fase 1)
- El profesional captura su cédula y sube documentos (cédula, título, INE, comprobante) desde `/profesional/verificacion`; los archivos van al bucket privado `professional-documents` (carpeta por `profile_id`).
- `submit_for_review()` (RPC) valida requisitos mínimos y pasa el perfil a `in_review`.
- El admin revisa en `/admin/verificacion` con URLs firmadas, consulta manualmente la cédula en https://cedulaprofesional.sep.gob.mx/ y aprueba (`verified` + visible en directorio) o rechaza con motivo.
- La investigación completa (benchmark, pagos, legal, roadmap) está en `docs/investigacion-plataforma-2026-07-27.md`.
