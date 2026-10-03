# Mesa de trabajo — SOMOS CALMA (actualizado 2026-10-02)

> Documento vivo. Lee SOLO este archivo para retomar contexto entre sesiones.
> Antes de cada sesión: verificar fecha de este archivo vs. últimos commits (`git log --oneline -5`)
> y últimos docs en `docs/`. Al terminar una tarea, actualizar las 3 secciones: Estado, Última sesión y Pendientes.

## 1. Estado actual (producción)

- **Versión:** `1.4.1-beta.1` (`platform/web/package.json` — bump obligatorio en cada release).
- **Fase:** Beta 1.0 en operación con usuarios reales. **Regla: no agregar funcionalidades nuevas por iniciativa propia.** Documento operativo: `BETA-OPERATIONS.md`. Backlog pospuesto: `docs/backlog-post-beta.md`.
- **Modelo de cobro vigente (2026-10-02):** cada profesional define su precio por consulta (sesión de 50 min) en un rango **$150–$350 MXN** (`professional_profiles.session_price`, centavos, CHECK 15000–35000, migración 025, default NULL). El paciente **paga directamente al profesional** (transferencia). **La plataforma no procesa cobros ni cobra comisiones.** Decisión del cliente (2026-10-02): los textos **no mencionan cuándo se paga** — el momento/forma de pago lo acuerdan profesional y paciente entre ellos; nosotros solo mostramos el precio. No queda ningún texto de "gratis" en sitio/app (solo líneas de crisis y comentarios internos).
- **En vivo:** https://somos-calma.com (sitio estático en raíz, GitHub Pages) y https://somos-calma.com/app/ (React, HashRouter, despliegue automático vía `.github/workflows/deploy-app.yml`).
- **Supabase Cloud:** proyecto `qjwebikgrqtotqfipeqt`. Migración más reciente: **026**. Ninguna pendiente por aplicar.
- **Deploy:** push a `main` → workflow compila `platform/web` y copia a `/app/`. Secrets ya configurados en GitHub Actions.

## 2. Qué existe (mapa funcional resumido)

- **3 portales** (paciente / profesional / admin) con `PortalLayout` unificado: drawer móvil izq. + bottom nav (quickNav máx. 4) + campana de notificaciones.
- **Citas:** slots de 50 min (`availability_slots`, EXCLUDE anti-traslape), booking con RPC `get_booked_slots`, constraint anti doble-reserva (migración 009), purga horaria de vencidos (024).
- **Videollamadas:** **JaaS (8x8.vc)** vía Edge Function `jaas-token` (JWT por cita); fallback automático a meet.jit.si (5 min) con Alert visible si ocurre. Admin tiene `/admin/prueba-videollamada` (sala de prueba JaaS + comparador Daily.co).
- **Chat paciente↔profesional** (023): solo si hay cita no cancelada; escritura solo por RPCs; adjuntos bucket privado `chat-attachments`; supervisión silenciosa admin en `/admin/chats`.
- **Tutoriales** (022): 5 videos editados subidos como `approved` (NO publicados — regla del cliente: nada se publica sin visto bueno). Bucket privado `tutorials`. Gestión admin en `/admin/tutoriales`.
- **Correos:** Resend (SMTP + Edge Functions `send-email`, `contact-form`, `user-emails`, `send-broadcast`, `appointment-reminders`, `support-request`, `admin-contact`). Buzón hola@somos-calma.com en Hostinger (MX/SPF/DKIM/DMARC OK; DKIM de Resend en subdominio `send`).
- **Analíticas first-party:** Edge Function `track-view` → tabla `page_views` + panel `/admin/analiticas`. GA4 como complemento.
- **Intake/encuesta:** `patient_profiles.intake` (JSONB) filtra directorio; PHQ-9/GAD-7 opcionales.
- **Reseñas:** paciente→profesional (públicas anónimas), profesional→paciente (privadas).
- **PWA:** instalable (Android/iOS), service worker con banner "Nueva versión disponible", botón "Instalar app" en portales y banner en login.

## 3. Última sesión (2026-10-02, COMPLETA y desplegada) — Precio por consulta + fin del "gratis" + seguridad de verificación

**Commits:** `74e0815` (precio/gratis, v1.4.0) → `04d9a2d` (seguridad verificados, migración 026) → `2d3140a` (docs) → `b1df5cf` (selector visibilidad admin, v1.4.1). Todo en verde en GitHub Actions; producción verificada (sitio sin "gratis", app 1.4.1 con precios en vivo).

Modelo de pago directo profesional→paciente. Migración 025 aplicada en Cloud (constraint 15000–35000 centavos, default NULL). App: `ProfessionalProfile` captura precio (validación 150–350, helper `src/lib/format.ts` → `formatMXN`), directorio y `BookAppointment` muestran el precio y aviso de pago directo, dashboards y FAQs actualizados. Sitio estático: "gratis" sustituido en index, pacientes, profesionales, membresías, matching, bot y legales. Migración 026: INSERT de `availability_slots` y de citas exige profesional **verificado** (hueco real cerrado: un no-verificado publicaba horarios vía API; probado pendiente→403, verificado→201; regresión seguridad 22/22); `ProfessionalAvailability` muestra aviso si no hay verificación. **Selector Sí/No de visibilidad** en `/admin/profesionales` (conecta `updateProfessionalVerification`, que existía sin uso). Regla del día: el directorio exige `verified` **y** `is_visible`.

**Incidente resuelto:** Carlos Urbina quedó `verified` + `is_visible=false` (su verificación se hizo por SQL sin encender visibilidad; era el único en ese estado). Corregido a visible; su precio ($300) intacto. **Pendiente de él: volver a capturar sus horarios en Disponibilidad** (sus slots se purgaron al estar invisible, migración 026/024).

Verificado el día: lint 0 errores, tests 31/31, builds ✓, chequeo de salud completo (sitio/app 200, 10/10 Edge Functions CORS, DB activa 40 usuarios/4 citas/11 verificados, auth-flow 15/15). Guía creada: `docs/monitoreo-y-diagnostico.md`.

**Nota operativa:** el remoto avanza seguido por Dependabot — antes de push hacer siempre `git pull --rebase origin main`.

## 3b. Sesión 2026-09-17 — PWA + UX móvil

Commits: `c96c51c` (PWA v1.1.0) → `1b3b5e5` (drawer) → `f053b56` (bottom nav, woff2, skeletons, v1.2.0) → `dfaaec9` (botón instalar, v1.3.0) → `9679c46` (banner instalación login + íconos marca). Reporte: `docs/reporte-pwa-2026-09-17.md`. Todo probado (lint/test 31-31/build) y ya desplegado.

**Pendiente de esa sesión (requiere dispositivo real):**
1. Android/Chrome: instalar desde el sitio y verificar banner de actualización en el próximo release.
2. iOS/Safari: "Compartir → Agregar a inicio", validar icono y standalone.

## 4. Pendientes activos (prioridad)

| # | Qué | Detalle | Estado |
|---|-----|---------|--------|
| P0 | Publicar tutoriales | Esperar **visto bueno del dueño**; luego cambiar estado a `published` en `/admin/tutoriales` | Bloqueado por cliente |
| P1 | Horarios de Carlos Urbina | Avisarle que vuelva a capturar su Disponibilidad (slots purgados mientras era invisible) | Pendiente (usuario) |
| P1 | Instalación/actualización PWA en dispositivos reales | Ver ítems de sección 3b | Pendiente |
| P0 | Prueba real de videollamada JaaS | Verificar con cliente que `JAAS_KID` no esté truncado; hacer llamada real de 2 dispositivos | Pendiente |
| P1 | Re-grabar v1 y v5 | v1 tiene PII propia y de tercero; v5 muestra flujo que falló y explorador personal (aunque ambos fueron aprobados por decisión expresa del dueño, conviene re-grabar) | Decisión del cliente |
| P2 | Decisión proveedor de video | Comparación JaaS vs Daily.co en `/admin/prueba-videollamada`; JaaS gratis hasta 25 MAU, después $99/300 MAU; plan futuro: Jitsi propio | Decisión del cliente |
| P2 | Pagos | Solo cuando haya tracción. Requisito: tarjeta + PayPal + SPEI (Openpay cubre tarjeta+SPEI; PayPal aparte). El sitio ya lo anuncia como "próximamente" | Diferido |
| P3 | WhatsApp recordatorios | Requiere WhatsApp Business API (de pago) | Decisión del cliente |
| P3 | Activar CI completo | Copiar `docs/deploy-app.propuesto.yml` sobre `.github/workflows/deploy-app.yml` (necesita token con permiso `workflow`) | Técnico, fácil |

## 5. Datos rápidos de consulta

- **Supabase:** ref `qjwebikgrqtotqfipeqt` (CLI vinculada: `supabase db query --linked -f <sql>`; `supabase functions deploy <fn>`).
- **Credenciales:** `.env` en `platform/web/` (nunca subir service role key). Secrets en vault de Supabase: `CRON_SECRET` (y otros en Edge Function secrets: Resend, JAAS_*, DAILY_API_KEY).
- **Comandos:** `cd platform/web && npm run dev|build|test|lint`. Build debe pasar siempre antes de push.
- **Edge Functions activas:** `send-email`, `contact-form`, `user-emails`, `send-broadcast`, `appointment-reminders`, `support-request`, `admin-contact`, `jaas-token`, `daily-test-room`, `track-view`.
- **Buckets Storage:** `avatars`, `professional-documents` (privados), `chat-attachments`, `tutorials`.
- **Tests de regresión** (`platform/web/scripts/`): `test-auth-flow.mjs` (15), `test-core-flows.mjs` (22, necesita cuentas e2e), `test-chat.mjs` (28), `test-jaas.mjs` (22), `test-daily.mjs` (6), `test-analytics.mjs` (13, usa `ADMIN_PASSWORD`).
- **¿Algo falla? → `docs/monitoreo-y-diagnostico.md`** (semáforo de salud, tabla de síntomas, baterías y fuentes de logs).
- **Reglas de código:** ver `AGENTS.md` §Convenciones (prohibidos alert/confirm/prompt; usar componentes UI de `src/components/ui/`; errores siempre con `Alert`).
- **Videos originales** (fuera del sitio): `VIDEOS TUTORIALES/`, `recursos/`. `.tools/` tiene ffmpeg (gitignored).

## 6. Reglas del cliente (memoria)

1. Ningún video se publica automáticamente — flujo explícito de aprobación.
2. La app instalada solo contiene login + portales; páginas públicas SIEMPRE en pestaña nueva.
3. **Cobro (vigente desde 2026-10-02):** la plataforma NO cobra ni procesa pagos; cada profesional pone su precio ($150–$350 MXN, solo ese rango) y el paciente le paga directo. Los textos **no mencionan cuándo ni cómo se paga** — lo acuerdan entre ellos.
4. Correo único de contacto: hola@somos-calma.com.
5. Legales actualizados a persona física (domicilio genérico "Ciudad de México, México").
6. Cambio del rango de precios ($150–$350) solo vía migración — nunca hardcodear otro rango.
