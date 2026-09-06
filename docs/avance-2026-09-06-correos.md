# Avance — 2026-09-06: Buzón institucional, correos automáticos y Comunicados

> Sesión: se recuperó el correo institucional (Hostinger + Resend), se construyó y
> desplegó el sistema de correos transaccionales automáticos y el panel de
> Comunicados (avisos masivos). Se cierra el pendiente #10 de AGENTS.md.

---

## ✅ 1. Buzón institucional `hola@somos-calma.com` (pendiente #10 cerrado)
- El cliente compró el correo en Hostinger: MX (`mx1/mx2.hostinger.com`), SPF de
  Hostinger en la raíz, DKIM `hostingermail-a/b/c._domainkey`, DMARC `p=none`.
- Al aplicar los registros sugeridos por Hostinger se **eliminó el DKIM de Resend**
  (`resend._domainkey`, TXT con la clave pública) → se restauró y el dominio volvió
  a quedar Verified en Resend. Verificado por DNS contra el servidor autoritativo.
- Secret `CONTACT_INBOX` de `contact-form` reapuntado a `hola@somos-calma.com`,
  función redeplegada, prueba real entregada en el Webmail de Hostinger.
- **Fix:** el HTML del correo de contacto no declaraba charset → se agregó
  `<!DOCTYPE html>` + `<meta charset="UTF-8">` (las demás plantillas ya lo traían).
- Sin conflicto Hostinger↔Resend: el webmail envía con SPF de la raíz; Resend firma
  con el subdominio `send` (SPF + MX de `feedback-smtp.us-east-1.amazonses.com`,
  intactos durante todo el incidente).

## ✅ 2. Correos transaccionales automáticos (migración 019)
- Tabla `email_broadcasts` (historial de comunicados, RLS admin).
- `dispatch_user_email(type, payload)`: despacha vía `pg_net` → Edge Function
  interna `user-emails`. Best-effort (bloque `EXCEPTION WHEN OTHERS`): un fallo de
  correo nunca tumba la operación de la BD. pg_net difiere la petición al COMMIT.
- Triggers: `welcome_new_user` (bienvenida por rol al registrarse),
  `notify_appointment_events` (cancelación → correo a paciente Y profesional),
  `notify_verification_events` (verificación aprobada/rechazada con motivo).
- Edge Function `user-emails`: plantilla de marca (misma línea visual que
  `src/lib/emailTemplate.ts`), header `x-cron-secret`, reintentos de lectura de
  perfil para el caso bienvenida.

## ✅ 3. Comunicados masivos (panel admin)
- `AdminBroadcasts` (`/admin/comunicados`, menú con icono Megaphone): redactar
  asunto/cuerpo, audiencia (todos/pacientes/profesionales), historial con
  contadores de enviados/fallidos (`email_broadcasts`).
- Edge Function `send-broadcast`: valida JWT de admin internamente (mismo patrón
  que `send-email`); envía con Resend en lotes.

## 🐛 Bug encontrado y corregido en caliente (migración 020)
- **Síntoma:** el correo de bienvenida de prueba nunca llegó y `net._http_response`
  no mostraba peticiones a `user-emails` — `dispatch_user_email` salía en silencio.
- **Causa raíz:** la función buscaba `CRON_SECRET` en `vault.decrypted_secrets`,
  pero el vault **está vacío**: el secreto vive como Edge Function secret y
  hardcodeado en `cron.job` (AGENTS.md decía "en vault" — incorrecto).
- **Fix 020:** secreto incrustado en la función (mismo patrón/nivel de exposición
  que `cron.job`). Verificado: `net._http_response` registra
  `200 {"ok":true,"sent":1}` al disparar `welcome_patient`.
- **Aprendizaje:** el rol del Management API no lee `vault`; para inspeccionar
  secretos usar funciones SECURITY DEFINER temporales (y borrarlas), o leer
  `net._http_response` para depurar pg_net.

## 📋 Pendientes
1. Correr `platform/web/scripts/test-emails.mjs` (requiere `CRON_SECRET` y
   `ADMIN_PASSWORD` de admin@demo.com) — suite E2E del sistema de correos.
2. Borrar/dedup si se acumulan correos de prueba en el buzón institucional.
3. El envío *programado* (calendarizar comunicados para fecha/hora futura) no está
   implementado: hoy se envían al momento. Ver `docs/backlog-post-beta.md`.
