# AGENTS.md — SOMOS-CALMA

## Contexto del proyecto
Plataforma de acompañamiento emocional y tanatología en México. Actualmente en fase beta/MVP.

## Ubicación del código fuente
- Nuevo stack React: `platform/web/`
- Migraciones Supabase: `platform/supabase/migrations/`
- Sitio estático legacy: raíz del repo (`index.html`, `assets/`, `pages/`)

## Stack
- React 19 + Vite 8 + TypeScript 6
- Tailwind CSS 3
- React Router DOM 7
- Lucide React (iconos)
- Supabase Auth + PostgreSQL + Edge Functions (conectado a proyecto cloud)
- Jitsi Meet (pendiente de integración)
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
8. ✅ Secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configurados en GitHub Actions; deploy automático verificado (build de `/app` con la URL de Supabase embebida).
9. Implementar pagos (Openpay recomendado para marketplace MX; ver `docs/investigacion-plataforma-2026-07-27.md`) cuando haya tracción.

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

## Verificación de profesionistas (Fase 1)
- El profesional captura su cédula y sube documentos (cédula, título, INE, comprobante) desde `/profesional/verificacion`; los archivos van al bucket privado `professional-documents` (carpeta por `profile_id`).
- `submit_for_review()` (RPC) valida requisitos mínimos y pasa el perfil a `in_review`.
- El admin revisa en `/admin/verificacion` con URLs firmadas, consulta manualmente la cédula en https://cedulaprofesional.sep.gob.mx/ y aprueba (`verified` + visible en directorio) o rechaza con motivo.
- La investigación completa (benchmark, pagos, legal, roadmap) está en `docs/investigacion-plataforma-2026-07-27.md`.
