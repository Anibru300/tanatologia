# Auditoría técnica — 2026-09-06: Sistema de correos completo

> Auditoría + configuración + pruebas E2E de todo el sistema de correo de la
> plataforma (envío Resend/SES desde `hola@somos-calma.com`, recepción Hostinger,
> correos transaccionales, soporte, contacto admin, notificaciones in-app).

## Arquitectura del correo (estado final)

| Pieza | Rol | Estado |
|---|---|---|
| **Resend (API + SMTP)** `api.resend.com` | Infraestructura de ENVÍO (correos transaccionales, broadcast, auth) con remitente `SOMOS-CALMA <hola@somos-calma.com>` | ✅ |
| **Hostinger** `mx1/mx2.hostinger.com` | Buzón de RECEPCIÓN `hola@somos-calma.com` (Webmail) + envío manual desde webmail | ✅ |
| **Supabase Auth SMTP** `smtp.resend.com` | Correos de autenticación (recuperación de contraseña, plantilla personalizada) | ✅ |
| DNS | MX Hostinger · SPF raíz Hostinger · SPF+MX `send` (SES) · DKIM Resend + Hostinger · DMARC `p=none` | ✅ |

Decisión documentada: el ENVÍO automático se mantiene en Resend (SES) y no en el
SMTP de Hostinger: DKIM/SPF alineados, reintentos, API, límites conocidos y sin
acoplar funciones serverless a un buzón. El remitente sigue siendo la dirección
oficial del buzón Hostinger. Migrar el envío a `smtp.hostinger.com` sería un
cambio de proveedor innecesario y con peor entregabilidad.

## Funciones de correo desplegadas (9, todas ACTIVE)

| Función | Tipo | Auth | Qué envía |
|---|---|---|---|
| `contact-form` | Pública | honeypot + rate-limit 5/min/IP | Formulario público (index.html) → `CONTACT_INBOX` |
| `support-request` | Autenticada (cualquier rol) | rate-limit 3/min/IP | Soporte desde portales → inbox, reply_to usuario, notif. `support_request` |
| `send-email` | Autenticada | paciente solo a sí mismo; otros roles a terceros | Confirmación de cita (desde `BookAppointment`) |
| `user-emails` | Interna | `x-cron-secret` | Bienvenida, cancelación (ambas partes), verificación |
| `send-broadcast` | Admin | JWT admin | Comunicados masivos (lotes de 100) |
| `admin-contact` | Admin | JWT admin estricto | Correo de marca a un usuario + notif. `admin_message` |
| `appointment-reminders` | Interna | `x-cron-secret` | Recordatorios 24 h y 15 min (paciente y profesional) |
| `track-view` | Pública | rate-limit | (sin correo) |
| `jaas-token` | Autenticada | JWT | (sin correo) |

## Resultados de las pruebas E2E (producción, 2026-09-06)

| # | Prueba | Método | Resultado |
|---|---|---|---|
| 1 | Bienvenida automática al registrarse | Signup real de usuario de prueba → trigger `welcome_new_user` → `user-emails` | ✅ `200 {"sent":1}` |
| 2 | Contacto público → buzón | POST `contact-form` + entrega confirmada en Webmail Hostinger | ✅ |
| 3 | Soporte paciente → inbox + notif. in-app | `support-request` con JWT de paciente de prueba | ✅ `{"ok":true}` + notificación `support_request` |
| 4 | Anti-spam en `send-email` | Paciente intenta enviar a tercero | ✅ `403` |
| 5 | Anti-escalación `admin-contact` | Paciente intenta usar función admin | ✅ `403` |
| 6 | Admin → paciente (correo + notif.) | `admin-contact` a cuenta real | ✅ `{"sent_to":"ing.carlosurbina300@gmail.com"}` + notificación `admin_message` |
| 7 | Recordatorios 24 h + 15 min | Cita de prueba a +14 min → `dispatch_reminders_cron` | ✅ `{"sent_24h":2,"sent_15m":2,"failed":0}` |
| 8 | Cancelación de cita → ambas partes | UPDATE status='cancelled' | ✅ `{"sent":2}` + notif. in-app |
| 9 | Verificación aprobada | PATCH admin real | ✅ `{"verification_verified","sent":1}` |
| 10 | Verificación rechazada (con motivo) | PATCH admin real | ✅ `{"verification_rejected","sent":1}` |
| 11 | Recuperación de contraseña | `/auth/v1/recover` SMTP Resend | ✅ HTTP 200 (entrega a confirmar por el usuario) |
| 12 | Rotación CRON_SECRET | Secreto viejo → `401`; vault → cron → función `200` | ✅ |
| 13 | Limpieza | Usuarios/datos de prueba eliminados (0 restos) | ✅ |

Correos cuyo contenido en bandeja debe confirmar el dueño (llegaron como `sent:1`
del lado del servidor): bienvenida ×2 a `ing.carlosurbina300@gmail.com`,
`admin-contact` de prueba al mismo correo, recuperación de contraseña, y correos
de soporte/recordatorios en el Webmail de Hostinger.

## Hallazgos y correcciones de la auditoría

1. **CRON_SECRET expuesto en el repo** (migración 020, igual que `cron.job`):
   rotado (nuevo valor en vault + Edge Function secret) y sacado del texto del
   cron. El valor viejo quedó invalidado (prueba: `401`).
2. **`dispatch_user_email` silencioso** (descubierto 2026-09-06, fix 020; el
   secreto nunca estuvo en vault): hoy el secreto vive en vault y funciona.
3. **`support-request` no insertaba la notificación in-app**: la tabla
   `notifications` no tiene política INSERT para authenticated (diseño
   intencional). Fix: insertar con service role (el `profile_id` sigue siendo
   el del usuario).
4. **Inconsistencia visual menor**: `appointment-reminders` usa plantilla propia
   (turquesa `#046e6b`) distinta a la marca verde del resto. No se cambió
   (solo cosmético; backlog).
5. **Soporte/admin-contact no existían como flujo**: se implementaron (funciones
   + UI) — ver AGENTS.md §14.

## Seguridad verificada

- Sin credenciales en el frontend ni en el build público (solo anon key).
- Secrets solo en Supabase (Edge Function secrets / vault); el repo ya no
  contiene valores de secreto (la 020 histórica quedó invalidada por rotación).
- `send-email`: paciente solo a su propia dirección; roles elevados a terceros.
- `admin-contact`/`send-broadcast`: validan rol admin desde `profiles`.
- Funciones internas (`user-emails`, `appointment-reminders`): `x-cron-secret`.
- Rate-limits en memoria en funciones públicas/autenticadas.
- HTML escapado en todas las plantillas (escapeHtml) — sin inyección de
  contenido; destinatario siempre deducido del servidor, nunca arbitrario.
- Errores al usuario en español y genéricos; detalle técnico solo en logs.

## Pendientes / observaciones (no bloquean)

1. Confirmación visual por el usuario de las bandejas (Gmail + Webmail).
2. `AdminSupport` sigue siendo placeholder (tickets); el soporte opera por
   `support-request` + inbox. Backlog.
3. Plantilla de recordatorios con estilo distinto (cosmético). Backlog.
4. Programar envío de comunicados para fecha futura: no implementado (se envían
   al momento). Backlog.
5. Cuota Resend free: 100 correos/día — suficiente para la Beta; monitorear.
6. Recomendación a futuro: endurecer DMARC de `p=none` a `quarantine` cuando se
   tenga volumen estable.
