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
0. 🔴 **(2026-09-02) El proyecto Supabase Cloud `qjwebikgrqtotqfipeqt` NO resuelve en DNS** (NXDOMAIN, verificado con 8.8.8.8 y 1.1.1.1). El sitio desplegado (formulario de contacto) y la app apuntan a ese ref. **Acción del cliente:** verificar en supabase.com si el proyecto fue eliminado/pausado o cambió el ref; restaurarlo o entregar `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` nuevos (también actualizar secrets de GitHub Actions y `index.html`).
0b. ⏳ **Migraciones 010 y 011 escritas pero NO aplicadas en Cloud** (no se pudo verificar por el punto 0). Aplicar cuando el proyecto vuelva: `010_feedback.sql` (tabla `feedback` + RLS + trigger de rol) y `011_security_hardening.sql` (triggers que escriben `audit_logs` + Storage de documentos restringido a rol profesional). Redesplegar la Edge Function `contact-form` (ahora con rate-limit por IP).
0c. ⏳ **Pruebas E2E pendientes:** con el proyecto accesible, correr `node scripts/test-auth-flow.mjs` (crea usuarios de prueba marcados; borrarlos después del dashboard) y validar flujos paciente/profesional/admin de los Bloques 3–6 y 10.
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

10. 🔴 **URGENTE — Buzón de hola@somos-calma.com no existe (2026-08-02):** el dominio NO tiene registros MX; Resend solo ENVÍA. Los correos del formulario de contacto (`contact-form`) rebotan porque no hay dónde entregarlos. **Acción del cliente en Hostinger (hPanel → Emails):** crear reenvío de `hola@somos-calma.com` → `lupitamcampuzano@outlook.com` (o buzón real). Plan B si el plan no incluye reenvío: cambiar el secret `CONTACT_INBOX` de la Edge Function al correo personal. Verificar después con `nslookup -type=MX somos-calma.com` y re-probar el formulario.

11. ✅ (2026-08-16) Calidad de código: Vitest configurado (vía npx, sin tocar el lockfile) con tests de la lógica crítica de videollamadas (`src/lib/videoSession.ts`, `video.ts`, `utils.ts`); el CI propuesto corre **lint + tests + build** en cada push y en cada PR (ver `docs/deploy-app.propuesto.yml`; copiar sobre `.github/workflows/deploy-app.yml` para activarlo — el token de automatización no tiene permiso `workflow`). Dependabot activo (npm + GitHub Actions, semanal).
12. ✅ (2026-08-16) Videollamadas pulidas: chequeo previo de cámara/micrófono con instrucciones en español (`DeviceCheck`), ventana de acceso por cita (paciente entra 15 min antes y hasta 15 min después de que termina; fuera de ventana ve conteo regresivo o aviso de sesión terminada), experiencia compartida `VideoCallExperience`, Jitsi en español con `disableDeepLinking` (evita el salto a la app en móvil) y pantalla de error con opción de abrir la sala en pestaña nueva si el iframe es bloqueado.
13. ⏳ Migración de videollamadas a **JaaS (8x8.vc)** cuando haya volumen: meet.jit.si exige que quien crea la sala inicie sesión (Google/GitHub); por eso el profesional (anfitrión) debe entrar primero. JaaS elimina ese login, permite marca propia y JWT por usuario. El código ya es compatible: basta definir `VITE_JITSI_DOMAIN=8x8.vc` y agregar firma de JWT en una Edge Function.

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

## Modo Beta gratuita (2026-09-02)
- La plataforma opera en **Beta gratuita**: ningún precio, pago, membresía o cotización debe ser visible ni bloquear flujos.
- Qué se eliminó y qué quedó reservado para monetización futura está documentado en `docs/beta-monetizacion-diferida.md` (incl. rutas retiradas y páginas admin conservadas sin menú).
- `siteConfig.pricing` (app y sitio) queda como fuente central reservada — no añadir consumidores en UI durante la Beta.
- Legales (terminos/cancelacion/aviso-privacidad) aún asumen cobros: pendiente versión "sin pagos" del cliente.

## Feedback de la Beta (2026-09-02)
- Tabla `feedback` (migración 010): tipo (`general|suggestion|issue|praise`), rating 1–5, comentario ≤2000, estado (`new|in_review|resolved|dismissed`), notas de admin. RLS: propio + admin total; DELETE propio solo en `new`.
- UI: `FeedbackForm`/`FeedbackList` compartidos (`src/features/feedback/`); páginas `/paciente/feedback`, `/profesional/feedback` y `/admin/feedback` (filtros rol/tipo/estado/fecha, cambio de estado con notas).
- El `role` de cada feedback lo fija el trigger `set_feedback_role()` desde `profiles` — nunca desde el cliente.

## Verificación de profesionistas (Fase 1)
- El profesional captura su cédula y sube documentos (cédula, título, INE, comprobante) desde `/profesional/verificacion`; los archivos van al bucket privado `professional-documents` (carpeta por `profile_id`).
- `submit_for_review()` (RPC) valida requisitos mínimos y pasa el perfil a `in_review`.
- El admin revisa en `/admin/verificacion` con URLs firmadas, consulta manualmente la cédula en https://cedulaprofesional.sep.gob.mx/ y aprueba (`verified` + visible en directorio) o rechaza con motivo.
- La investigación completa (benchmark, pagos, legal, roadmap) está en `docs/investigacion-plataforma-2026-07-27.md`.
