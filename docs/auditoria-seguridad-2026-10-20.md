# Auditoría de seguridad — SOMOS-CALMA

**Fecha:** 2026-10-20
**ESTADO: REMEDIADA (2026-10-20)** — C1 (verificación pendiente), A1, A2, A3, A4, M1, M2, M4, M5, M8 aplicados en producción. Detalle al final del documento.

**Motivo:** preocupación expresada por un paciente y un profesionista sobre la seguridad de la plataforma (acceso a bases de datos, cédulas profesionales, métodos de pago).
**Alcance:** 34 migraciones Supabase (001–034), 15 Edge Functions, frontend React + sitio estático, GitHub Actions, gestión de secretos.
**Metodología:** revisión estática tipo caja blanca simulando un atacante con (a) anon key pública, (b) cuenta de paciente, (c) cuenta de profesional, (d) acceso al repo.

---

## Veredicto general

**La plataforma está bien construida para una beta.** No se encontraron vías para que un atacante externo (sin cuenta) lea la base de datos: el RLS está habilitado y correctamente basado en `auth.uid()` en todas las tablas (nada de `USING (true)` salvo casos intencionales), los datos sensibles (cédulas, notas clínicas, mensajes) viven en buckets privados con policies estrictas, la clave `service_role` nunca sale del servidor, y la clave privada JaaS no está en el repo.

**Sí se encontraron vulnerabilidades reales**, la mayoría de un mismo patrón: funciones de base de datos `SECURITY DEFINER` ejecutables por cualquiera (el default de Postgres es `EXECUTE TO PUBLIC`) y un relay de correo demasiado permisivo. Ninguna expone hoy datos clínicos masivos, pero todas son explotables y deben cerrarse.

### Respuesta directa a la preocupación de paciente/profesionista

| Miedo expresado | Realidad técnica |
|---|---|
| "Pueden acceder a las bases de datos" | Solo con una cuenta válida y **solo a sus propios datos** (RLS por `auth.uid()`). Sin cuenta, el anon key no lee ninguna tabla del negocio. ✅ |
| "Se roban las cédulas profesionales" | El bucket `professional-documents` es **privado**; las URLs firmadas (signed URLs) expiran a la hora y solo las genera el propio profesional o el admin. No hay lista pública. ✅ (pero ver A4/M1: un profesional con una cita **cancelada** lee el expediente completo del paciente). |
| "Métodos de pago" | **No existen.** La Beta es gratuita; no hay tabla de tarjetas, no hay pasarela, ningún dato de pago se almacena. Es imposible robar lo que no está. ✅ (para el futuro: Openpay/PayPal serán server-side only, nunca en el cliente). |

---

## 🔴 CRÍTICO

### C1. Secreto real en el historial de git (`020_dispatch_user_email_fix.sql`)

El `CRON_SECRET` (bearer token que autentica las Edge Functions internas `user-emails` / `appointment-reminders` / `whatsapp-notify`) está en texto plano en la migración 020, línea 23. La 021 lo rotó y lo movió al vault, **pero el valor viejo sigue en el historial de git**, y el repo se publica en GitHub (es el origen del sitio).

**Verificación pendiente (P0):** confirmar en Supabase (`supabase secrets list`) que el secret actual de las Edge Functions **difiere** de `5f95…a05e`. Si coinciden, cualquiera que lea el repo puede invocar las funciones internas y enviar correos/WhatsApp de marca arbitrarios.
**Además:** considerar purgar el historial (git filter-repo/BFG) si el repo es público, y eliminar la línea de la 020.

---

## 🟠 ALTO

### A1. Funciones SECURITY DEFINER ejecutables por cualquiera (patrón systemic)

En Supabase el default es `EXECUTE … TO PUBLIC`: salvo 3 excepciones, **todas** las funciones del repo las puede invocar cualquier usuario autenticado (y varias, el rol `anon`). Las peligrosas:

| Función | Qué permite a un atacante autenticado |
|---|---|
| `dispatch_user_email`, `dispatch_reminders_cron` (019/021), `dispatch_whatsapp` (034) | SECURITY DEFINER que lee el CRON_SECRET del vault y dispara la Edge Function con header válido → **enviar correos/WhatsApp transaccionales de marca con payloads arbitrarios** (`type: 'verification_verified'`, `profile_id` de cualquiera). Phishing con la identidad de la plataforma. |
| `get_booked_slots` (005) | Enumera la agenda de **cualquier** profesional, verificado o no. |
| `conversation_participants` (023) | Devuelve los profile IDs de ambos participantes de cualquier `conversation_id` (IDOR si el UUID filtra). |
| `can_chat` (023) | Sondear si dos perfiles cualesquiera tuvieron cita (metadatos privados). |
| `auto_complete_past_appointments` (031) | Mutación ejecutable por anon. Efecto limitado, pero es escritura anónima. |

**Fix (una migración):** `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon, authenticated;` en todas las SECURITY DEFINER, dejando EXECUTE solo donde el frontend realmente llama (RPCs de chat, booking, etc.). Las de despacho (`dispatch_*`) deben quedar sin EXECUTE para nadie: solo las llaman los triggers.

### A2. `send-email`: cualquier profesional envía correo arbitrario desde el dominio verificado

`platform/supabase/functions/send-email/index.ts:62-75` — un usuario con rol `professional` puede POSTear `to` (array sin límite), `subject` y `html` arbitrarios que salen con `from: hola@somos-calma.com` (dominio con DKIM/SPF/DMARC, reputación real). Sin rate limit. **Relay de spam/phishing oficial.** El único consumidor actual usa `to: email del propio paciente`.

**Fix:** restringir `professional` a destinatarios vinculados a sus citas (o quitar el rol si no hay caso de uso), limitar `recipients.length` (≤3) y longitudes de subject/html, y añadir rate limit por usuario.

### A3. Regresión: migración 014 rompió `submit_for_review()` (flujo de verificación)

La 006 introdujo la bandera de sesión `app.verification_change_allowed` precisamente para que la RPC pudiera cambiar `verification_status`; la 014 hizo `CREATE OR REPLACE` del trigger **sin el chequeo del GUC**. Resultado: el trigger exige `is_admin()` para cualquier cambio de `verification_status`, la RPC no es admin → **un profesional no puede enviar su expediente a revisión desde 2026-09-03** (denegación de servicio del flujo de verificación documental — el flujo que precisamente guarda las cédulas).

**Fix:** restaurar el chequeo del GUC en el trigger (o hacer que la RPC pase por `is_admin` de forma temporal). Funcionalidad rota, no exploit, pero es de las peores clases de bug: silencioso.

### A4. `is_assigned_patient` sin filtro de estatus → fuga del expediente del paciente

```sql
-- 007: EXISTS (... WHERE a.patient_profile_id = ... AND pp.profile_id = auth.uid())
--      falta: AND a.status <> 'cancelled'
```
La policy "Professionals read assigned patients" de `patient_profiles` expone **toda la fila** (`birth_date`, `emergency_contact_*`, `intake` JSONB, `reason_for_visit`) a cualquier profesional que haya tenido **cualquier** cita con el paciente, **incluso cancelada**. Un profesional agenda y cancela una cita con alguien → lee su expediente completo.

**Fix:** agregar `AND a.status <> 'cancelled'` a `is_assigned_patient` y a la policy equivalente de `patient_reviews` (M1).

---

## 🟡 MEDIO

- **M1.** `patient_reviews` (013): la policy de profesionales con cita tiene el mismo defecto que A4 (sin filtro de estatus): un profesional con solo una cita cancelada lee las reseñas privadas que otros escribieron del paciente.
- **M2.** Comparación de `CRON_SECRET` sin timing-safe comparison en `user-emails`, `appointment-reminders`, `whatsapp-notify` (`!==` en vez del `timingSafeEqual` que sí usan `inbound-email`/`jaas-webhook`). Inconsistente con el estándar del propio codebase; fix de 3 líneas con helper compartido.
- **M3.** Rate limits en memoria por instancia (`contact-form` 5/min, `support-request` 3/min, `track-view` 60/min): se evaden escalando instancias y rotando `x-forwarded-for`. `contact-form` es la más expuesta (correos al inbox real + costo Resend). Fix: contadores persistentes (tabla KV en Supabase) o Cloudflare Turnstile en el form público.
- **M4.** `inbound-email` no verifica que el destinatario sea `hola@inbound.somos-calma.com`: cualquier ruta inbound futura de la cuenta Resend alimentaría la bandeja admin. Fix: allowlist por env.
- **M5.** `handle_new_user` de la 034 **perdió `timezone`** (la 018 la persistía; la 034 reemplazó el INSERT y omite la columna) → registros nuevos con geografía "Desconocido"; además `(raw->>'whatsapp_opt_in')::boolean` lanza excepción con metadata manipulada → **registro falla por un campo que el cliente controla**. Fix: `nullif` + cast defensivo y restaurar timezone.
- **M6.** `notifications`: UPDATE policy sin `WITH CHECK` acotado — el usuario puede reescribir `type`, `title`, `body`, `link`, `created_at` de sus propias notificaciones (no solo `read_at`).
- **M7.** Migración 021 no reproducible (borra el secreto del vault sin recreación; `cron.unschedule(1)` asume jobid=1). Riesgo de reaplicar migraciones en un proyecto nuevo.
- **M8.** Sin CSP ni headers de seguridad en ninguna página (GitHub Pages no permite headers custom → meta-CSP como mitigación). La app clínica es frameable y sin CSP. Fix: `<meta http-equiv="Content-Security-Policy">` en `platform/web/index.html` (self + gtm + jitsi/8x8 + fonts) y sitio legacy.
- **M9.** GitHub Actions sin pin de SHA (`actions/checkout@v7` **y** `@v4` en el mismo workflow — inconsistencia —, `stefanzweifel/git-auto-commit-action@v7` con `contents: write`). Supply chain: un tag movido ejecuta código con write en main. Fix: pinear a SHA completos, empezando por la de terceros.
- **M10.** Sesión de Supabase en localStorage (superficie XSS: cualquier XSS futuro robaría la sesión completa). Hoy el único `dangerouslySetInnerHTML` está bien escapado (`AdminBroadcasts`). Mitigación futura: revisar CSP estricta; considerar cookies `httpOnly` si el hosting lo permite.
- **M11.** `tutorial_views` UPDATE policy con auto-subconsulta (patrón clásico de recursión RLS 42P17 / comportamiento no garantizado). Funciona hoy; conviene mover a función SECURITY DEFINER.
- **M12.** Triggers 003/005 bloquean al service role (`auth.uid()` NULL → RAISE) — cualquier Edge Function futura que actualice perfiles fallará. Si es intencional, documentarlo.

## 🟢 BAJO

- `send-email` devuelve el error crudo de Resend al cliente y confirma si falta `RESEND_API_KEY` (mensajes genéricos).
- `inbox-reply` permite "responder" un mensaje propio (`direction='out'` → se envía a sí mismo); filtrar `eq("direction","in")`.
- `track-view` acepta `/../foo` en el path (ensucia analíticos) y el rate limit usa el primer valor de `x-forwarded-for` (falsificable).
- `ctaUrl` sin escapar en `emailTemplate.ts:34` (inyección de atributo HTML si algún día se alimenta de datos de usuario).
- `is_admin(check_id)` invocable por anon → oráculo de UUIDs admin (fuerza bruta infactible; revocar por higiene).
- `feedback`: el usuario lee sus propias filas incluido `admin_notes` (notas internas).
- `professional_reviews_public` legible por cualquier autenticado, incluidos profesionales no verificados.
- Paciente puede insertar su cita con `status='confirmed'` directamente (CHECK lo permite; sin impacto real hoy).
- Triggers de perfiles bloquean al service role (ver M12).
- Contraseñas de prueba hardcodeadas en `scripts/test-*.mjs` (cuentas efímeras eliminadas; aceptable).
- Anon key embebida en el build de `/app/` — **diseño correcto de Supabase**, la protección es el RLS (auditado arriba).
- `quotes` rate-limit por email (rota emails = sin límite; form público, aceptable).
- CORS `Access-Control-Allow-Origin: *` en las 15 funciones — aceptable en este diseño (auth por header, no cookies); restricción obligatoria si algún día se migran a cookies de sesión.

---

## ✅ Lo que está bien (por si hay que defenderlo ante los usuarios)

1. **RLS en todas las tablas del negocio, basado en `auth.uid()`** — no en `auth.role()='authenticated'`. Sin tablas abiertas, sin `USING (true)` accidental.
2. **Escritura del chat solo por RPCs SECURITY DEFINER**, sin policies de escritura; `messages` nunca en Realtime (evita filtrado por WAL).
3. **Buckets sensibles privados**: `professional-documents` (cédulas), `tutorials`, `chat-attachments`, `email-attachments`, con policies por carpeta/estado y signed URLs de expiración corta.
4. **Service role key solo en Edge Functions vía `Deno.env`**; verificado con grep: cero apariciones en frontend, cero `BEGIN PRIVATE KEY` en el repo.
5. **Webhooks bien hechos**: firma svix/HMAC sobre cuerpo crudo, comparación timing-safe, tolerancia anti-replay, idempotencia real (índices únicos parciales).
6. **`jaas-token` correcto**: un usuario no puede obtener token de citas ajenas (autorización vía RLS de `appointments`); modo testRoom exige rol admin desde `profiles`.
7. **Escalación de rol neutralizada** en signup (degradación a `patient`), triggers de columnas protegidas.
8. **Constraints EXCLUDE anti-traslape** y UNIQUE de integridad; constraints CHECK/NOT NULL/FOREIGN KEY consistentes.
9. **HTML escapado en todos los correos** (plantillas de marca), sin XSS reflejado en emails.
10. **Auth de Edge Functions por tabla `profiles`, nunca por claims del JWT** (anti-escalación verificada en tests 15/15).
11. Dependencias al día (React 19.2.7, Vite 8.1.0, supabase-js 2.108.2), lockfile + `npm ci` + Dependabot semanal.
12. Workflows con `permissions:` mínimos y sin eco de secretos.

---

## Plan de remediación priorizado

| # | Acción | Severidad | Esfuerzo |
|---|--------|-----------|----------|
| 1 | Verificar rotación del CRON_SECRET (C1) | 🔴 | 5 min |
| 2 | Migración 035: `REVOKE` masivo de EXECUTE en funciones SECURITY DEFINER (A1) | 🟠 | 1 h |
| 3 | Restringir `send-email` a destinatarios de citas + rate limit (A2) | 🟠 | 2 h |
| 4 | Restaurar GUC en trigger 014 / arreglar `submit_for_review` (A3) | 🟠 | 1 h |
| 5 | `AND status <> 'cancelled'` en `is_assigned_patient` + policy de reseñas (A4/M1) | 🟠 | 30 min |
| 6 | Fix defensivo en `handle_new_user` 034 (timezone + cast booleano) (M5) | 🟠 | 30 min |
| 7 | Timing-safe CRON_SECRET en 3 funciones (M2) | 🟡 | 30 min |
| 8 | Rate limit persistente o Turnstile en `contact-form` (M3) | 🟡 | 3 h |
| 9 | Allowlist de destinatario en `inbound-email` (M4) | 🟡 | 15 min |
| 10 | Meta-CSP en app + sitio legacy (M8) | 🟡 | 1 h |
| 11 | Pinear Actions a SHA (M9) | 🟡 | 1 h |
| 12 | `WITH CHECK` acotado en notifications; `inbox-reply` direction='in'; errores genéricos; `ctaUrl` escapado | 🟡/🟢 | 1 h |

**Validación posterior:** ampliar `scripts/test-core-flows.mjs` con casos de escalación (paciente intenta leer expediente ajeno, profesional con cita cancelada intenta leer paciente, usuario autenticado invoca `dispatch_user_email` y debe fallar con 42501).

---

## Herramientas y repositorios recomendados (GitHub)

Para blindar la plataforma de forma continua (que es lo que le da confianza a pacientes y profesionistas):

### Scanners de RLS (el riesgo #1 de Supabase)

| Herramienta | Qué hace | Cómo usarla aquí |
|---|---|---|
| **`redekerlouis-ai/rls-auditor`** | CLI read-only que audita RLS contra la DB viva: tablas sin RLS, policies abiertas a anon, `USING (true)`, INSERT sin WITH CHECK. | Correr periódicamente contra el proyecto Cloud (solo lectura). Es la que mejor encaja con el hallazgo A1. |
| **`srdaniellp/supabase-scanner`** | Escáner ofensivo: extrae URL+anon key del bundle público, enumera tablas/buckets/RPCs y prueba escritura — exactamente lo que un atacante haría. | Ejecutarlo contra `https://somos-calma.com` en modo defensivo para **demostrar** (reporte en mano) que el anon key no lee nada. |
| **`Securify-AI/Supabase-RLS-Extension`** | Extensión de Burp Suite: detecta credenciales Supabase en tráfico y prueba bypass de RLS. | Si algún día contratan un pentest, es el toolkit estándar. |
| **Supabase Security Advisor (Splinter)** | Ya incluido en el dashboard del proyecto (Database > Advisors). Revisa tablas sin RLS, funciones definer, search_path inseguro. | Revisión semanal; activar las alertas por correo. Ya debería estar marcando parte de A1. |
| **`@perufitlife/supabase-security`** (npm) | CLI gratuito (`npx`) que escanea URL+key y devuelve el `curl` exacto que un atacante usaría + SQL del fix. | Scan de 30 s en cada release. |

### Linters estáticos (CI)

| Herramienta | Qué hace |
|---|---|
| **GuardLayer** (guardlayer.io, OSS) | Scanner estático del repo: lee las migraciones `.sql` y detecta RLS sin habilitar, policies sin `with check`, secretos commiteados. Ideal para añadir como paso al workflow de deploy antes del build. |
| **gitleaks** (`gitleaks/gitleaks`) | Impide commitear secretos (habría atrapado el C1 en 020). Añadir como hook de pre-commit y paso de CI. |
| **TruffleHog** (`trufflesecurity/trufflehog`) | Alternativa a gitleaks con verificación de secretos vivos contra las APIs. |

### Hardening de plataforma

- **Supabase new API keys / asymmetric JWTs**: migrar cuando esté GA en el proyecto — claves revocables individualmente y JWTs asimétricos reducen el blast radius de una filtración (mitiga C1 de raíz).
- **GitHub push protection**: activarlo en el repo — bloquea pushes con secretos antes de que entren al historial (suplemento de gitleaks).
- **Cloudflare Turnstile** (gratuito, sin cookies): anti-spam real para `contact-form` (mejor que el honeypot + rate limit en memoria, M3).
- **Have I Been Pwned / Vulert / Dependabot**: Dependabot ya activo; Vulert monitorea el `package-lock.json` por CVEs (ej. CVE-2025-48370 de auth-js <2.69.1 — la versión actual 2.108.2 no afecta).

### El repositorio más útil para este proyecto, hoy

> **`redekerlouis-ai/rls-auditor`** + **`gitleaks`** + el **Security Advisor nativo** cubren las tres clases de problema encontradas (A1 funciones públicas, C1 secretos en repo, políticas permisivas). Correr las tres tras aplicar la migración 035 debería dar un reporte limpio para mostrar a los usuarios que preguntaron.

---

*Auditoría realizada por revisión estática del código (no se ejecutaron pruebas contra producción más allá de las ya documentadas en `test-auth-flow.mjs` / `test-core-flows.mjs`).*

---

## ✅ Remediación aplicada (2026-10-20)

| Hallazgo | Fix | Estado |
|---|---|---|
| A1 funciones SECURITY DEFINER públicas | Migración **035** aplicada en Cloud: `REVOKE` de EXECUTE a PUBLIC/anon/authenticated en `dispatch_user_email`, `dispatch_reminders_cron`, `dispatch_whatsapp`, `auto_complete_past_appointments`, `conversation_participants`, `can_chat`. Verificado en `pg_proc.proacl` (quedan solo postgres + service_role). Las RPCs del frontend (`get_booked_slots`, `start_conversation`, `send_message`, `submit_for_review`, `delete_own_account`) conservan EXECUTE. | ✅ Producción |
| A3 trigger 014 sin GUC | 035 restaura el chequeo `app.verification_change_allowed` en `enforce_professional_profile_update_restrictions` (merge de 006 + 014). Verificado en Cloud. | ✅ Producción |
| A4/M1 citas canceladas | 035: `AND a.status <> 'cancelled'` en `is_assigned_patient` y en la policy "Professionals with appointment read patient reviews". | ✅ Producción |
| M5 handle_new_user | 035: cast defensivo de `whatsapp_opt_in` (solo `'true'` literal) + `timezone` restaurado en el INSERT. | ✅ Producción |
| A2 send-email relay | Función redeplegada: profesional solo escribe a pacientes con cita NO cancelada (≤5 destinatarios, subject ≤200, html ≤200k, errores genéricos al cliente). | ✅ Producción |
| M2 timing-safe | `cronSecretValid()` (comparación en tiempo constante) en `user-emails`, `appointment-reminders`, `whatsapp-notify`. Redeplegadas. | ✅ Producción |
| M4 inbound-email | Allowlist `INBOUND_RECIPIENTS` (default `hola@inbound.somos-calma.com`); correos a otras rutas se ignoran con `ignored`. Redeplegada. | ✅ Producción |
| M8 sin CSP | Meta-CSP en `platform/web/index.html` (app) y en 18 páginas del sitio legacy (index, 404, pages/*). Ojo: `frame-ancestors` no aplica vía meta — el anti-clickjacking real requiere headers del hosting. | ✅ (deploy al push) |

**Pendiente post-remediación:**
- **C1 — RESUELTO (2026-10-20):** verificado con `supabase secrets get` que el CRON_SECRET actual **difiere** del expuesto en 020 (la rotación de 021 sí se aplicó) y el historial de git fue purgado con `git filter-repo --replace-text` en las 13 ramas (backup local en `somos-calma-backup-pre-purge-20261020.bundle`); verificado en raw.githubusercontent.com que la 020 ya muestra `***REMOVED-ROTATED-CRON-SECRET***`. Ojo: los PRs abiertos de Dependabot quedaron con historial reescrito (se cerrarán solos o se recrean).
- **M3** rate limit persistente / Turnstile en `contact-form` (pospuesto: cambio de arquitectura).
- **M6** WITH CHECK en notifications; **M7** migración 021 no reproducible; **M9** pin de SHA en Actions; **M10** sesión en localStorage; **M11** tutorial_views auto-subconsulta; **M12** triggers bloquean service role. Documentados, no bloqueantes.
- Redesplegar `app/` (el meta-CSP de la app entra en el build; el workflow lo publica al push a main).

**Pruebas post-remediación:**
- `test-auth-flow.mjs`: 15/15 (antes y después de la migración).
- `test-security-hardening.mjs` (nuevo): **13/13** — las 6 funciones revocadas rechazan con 42501 al autenticado; booking/chat/verificación siguen ejecutables; registro con metadata manipulada no falla y persiste timezone.
- `test-submit-review.mjs` (nuevo): **7/7** — flujo de verificación documental completo de punta a punta (registro profesional → cédula → 3 documentos → `submit_for_review` devuelve `in_review` y persiste). Confirma el fix A3.
- Build `npm run build`: OK.
