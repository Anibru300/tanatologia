# Monitoreo y diagnóstico rápido — SOMOS CALMA

> ¿Algo "se ve raro"? Lee la **tabla de síntomas (sección 2)**. Chequeo rutinario: **sección 1** (2 minutos).
> Comandos desde la raíz del repo en Windows (Git Bash). Fecha de creación: 2026-10-02.

## 1. Semáforo de salud (chequeo de 2 minutos)

```bash
# a) Sitio y app en producción — esperado: todo 200
for url in https://somos-calma.com https://somos-calma.com/app/ \
  https://somos-calma.com/app/sw.js https://somos-calma.com/app/manifest.webmanifest; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url")  $url"
done

# b) Edge Functions despiertas — esperado: todo 200 (CORS preflight, no escribe nada)
REF="https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1"
for fn in contact-form track-view jaas-token user-emails send-email \
  appointment-reminders support-request admin-contact send-broadcast daily-test-room; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X OPTIONS "$REF/$fn" \
    -H "Origin: https://somos-calma.com" -H "Access-Control-Request-Method: POST")  $fn"
done

# c) Base de datos responde
cd platform/supabase && supabase db query --linked "SELECT count(*) FROM profiles;"

# d) Último deploy — esperado: success (en verde)
cd ../.. && gh run list --limit 5
```

**Regla:** si (a) falla → es GitHub Pages/dominio; si (a) ok pero (b) falla → caída de Supabase o función borrada; si todo ok pero "la app hace cosas raras" → casi siempre es **caché del service worker** (pedir Ctrl+F5) o un **deploy pendiente** (revisar que el último commit tenga su run en verde).

## 2. Tabla de síntomas → diagnóstico

| Síntoma | Dónde mirar primero | Cómo confirmar / arreglo |
|---|---|---|
| Pantalla blanca o app no carga | Consola del navegador (F12 → Console/Network) | Errores de chunk = deploy a medias; Ctrl+F5; si persiste, revertir o redeploy |
| "Nueva versión disponible" no aparece tras release | Versión en footer vs. `package.json`; SW viejo | El SW nuevo se instala en segundo plano; abrir/cerrar la app. El bump de versión es obligatorio pero el SW detecta por hash aunque se olvide |
| No inicia sesión / registro falla | Supabase Dashboard → Authentication → Logs | Ver errores `auth`; confirmar que `Site URL = https://somos-calma.com/app/` en Authentication > URL Configuration |
| No llegan correos (citas, bienvenida, recordatorios) | Supabase Dashboard → Edge Functions → Logs (`user-emails`, `send-email`, `appointment-reminders`) | Ver 4xx/5xx y el body; luego dashboard de **Resend** (hola@somos-calma.com, dominio `send`) — si Resend está caído o la API key expiró |
| Videollamada no abre o cae a los 5 min | Logs de Edge Function `jaas-token`; sala de prueba admin `/admin/prueba-videollamada` | Si la sala de prueba admin funciona, el problema es el token de la cita; ver `JAAS_APP_ID`/`JAAS_KID`/`JAAS_PRIVATE_KEY` (secrets). Caída a 5 min = fallback a meet.jit.si (sin token JaaS) |
| No se puede agendar / "se traslapa" | Logs DB (errores 23P01); RPC `get_booked_slots` | Correr `test-core-flows.mjs`; revisar `availability_slots` vencidos (pg_cron los purga cada hora, migración 024) |
| Chat no entrega mensajes en tiempo real | Supabase → Database → Replication: publicación `supabase_realtime` debe incluir SOLO `conversations` | Si falta la tabla en la publicación, re-agregarla; los mensajes nunca se publican (diseño) |
| Formulario de contacto rechaza envíos | Logs de `contact-form` | 429 = rate-limit por IP (60/min); honeypot; `CONTACT_INBOX` secret |
| Muchos reportes de usuarios | `/admin/feedback` (clasificar) y tabla `audit_logs` | Priorizar P0; ver `BETA-OPERATIONS.md` §Prioridades |

## 3. Baterías de regresión (scripts ya existentes)

Desde `platform/web` (usan `.env`; algunos crean usuarios `@test.somos-calma.com` — **borrarlos después** con el SQL de la sección 4):

| Script | Verifica | Cuándo correrlo |
|---|---|---|
| `node scripts/test-auth-flow.mjs` | Auth, RLS, anti-escalación de rol (15) | Tras tocar auth/RLS/perfiles o constraint de DB. **Deja 3 cuentas creadas: borrarlas** |
| `node scripts/test-security-negative.mjs` | 22 pruebas negativas de seguridad | Tras cambios de políticas/roles |
| `node scripts/test-core-flows.mjs` | Slots, booking íntegro, doble-reserva, notificaciones, notas, feedback, contact-form (22) | Requiere cuentas `e2e-core-*` + profesional verificado (instrucciones en el header del script) |
| `node scripts/test-chat.mjs` | Chat completo (28) | Requiere `ADMIN_EMAIL`/`ADMIN_PASSWORD`; tras tocar chat/notificaciones |
| `node scripts/test-jaas.mjs` | Firma JWT JaaS (22) | Tras tocar `jaas-token` o secret JaaS |
| `node scripts/test-analytics.mjs` | page_views/track-view (13) | Tras tocar analíticas |
| `node scripts/test-daily.mjs` | Daily.co test room (6) | Solo si se toca `daily-test-room` |

Local siempre antes de push: `npm run lint && npm run test && npm run build`.

## 4. Fuentes de verdad (logs y paneles)

- **Supabase Dashboard → Logs**: Postgres (errores de constraints/triggers), Auth, Edge Functions (cada función por separado), Realtime.
- **Supabase → Database**: `audit_logs` (acciones sensibles de admin), `feedback` (lo que reportan los usuarios), tablas por conteo rápido.
- **GitHub → Actions**: único canal de deploy; un run rojo = producción vieja o a medias.
- **Resend Dashboard**: envíos, bounces, dominio `send.somos-calma.com` (DKIM).
- **Consola del navegador (F12)**: primera parada ante cualquier reporte de usuario; pedir captura de Console + Network.
- Limpieza de cuentas de prueba: `DELETE FROM auth.users WHERE email LIKE '%@test.somos-calma.com' RETURNING email;` vía `supabase db query --linked`.

## 5. Alertas baratas (sugerencias, ninguna activa aún)

1. **UptimeRobot (gratis):** monitoreo cada 5 min de `https://somos-calma.com/app/` y notificación por correo si cae. 5 minutos de alta.
2. **Supabase Log Drains / webhooks:** opciones de pago; la alternativa gratis es la revisión semanal de logs (checklist en `BETA-OPERATIONS.md` §Durante la Beta).
3. **Correo de reportes:** los usuarios ya pueden reportar desde `Feedback` en cada portal — revisar `/admin/feedback` semanalmente (ya en checklist).

## 6. Después de cada release (recordatorio)

`BETA-OPERATIONS.md` §8 tiene el smoke test manual completo (paciente/profesional/admin/público/contacto/citas). Mínimo imprescindible: login en los 3 roles + agendar/cancelar una cita de prueba.
