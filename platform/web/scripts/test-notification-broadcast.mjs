// Pruebas E2E de notificaciones in-app masivas (migración 028 + Edge Function
// send-notification-broadcast):
//   - CORS (OPTIONS), 401 sin sesión, 403 no-admin, 405 método inválido
//   - RLS: paciente no inserta en notification_broadcasts ni lee el historial
//   - dry_run: el admin recibe SOLO él la notificación de prueba
//   - Envío real filtrado (only_emails) a un paciente de prueba: contadores + recepción
//   - Idempotencia: reenviar el mismo broadcast_id → 409; broadcast inexistente → 404
//
// Uso:  node scripts/test-notification-broadcast.mjs
//   (flujo completo: ADMIN_EMAIL=admin@demo.com ADMIN_PASSWORD=<pass> node scripts/test-notification-broadcast.mjs)
// Requiere: .env con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY y CLI supabase vinculada.
// El envío real usa only_emails=[paciente de prueba] para NO notificar usuarios reales.
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const SUPABASE_URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
// Sin credenciales admin se prueba solo la superficie negativa (CORS, auth, RLS);
// con ADMIN_EMAIL/ADMIN_PASSWORD se prueba también el flujo completo de envío.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const HAS_ADMIN = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD)

const ts = Date.now().toString(36)
const EMAIL_PAT = `e2e-nb-${ts}@test.somos-calma.com`
const PASSWORD = 'Test1234!x'
const TITLE = `Prueba E2E notificación ${ts}`
let broadcastId = null

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* sin cuerpo */
  }
  return { status: res.status, json }
}

async function fn(payload, token, method = 'POST') {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-broadcast`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* sin cuerpo */
  }
  return { status: res.status, json, headers: res.headers }
}

function cleanup() {
  const sql = `
    DELETE FROM public.notification_broadcasts WHERE title = '${TITLE}';
    DELETE FROM public.notifications WHERE title = '${TITLE}';
    DELETE FROM auth.users WHERE email = '${EMAIL_PAT}';
  `
  const file = join(root, `.tmp-nb-del-${ts}.sql`)
  writeFileSync(file, sql)
  try {
    execSync(`cd ${join(root, '..', 'supabase')} && supabase db query --linked -f "${file}"`, { stdio: 'pipe' })
    console.log('🧹 Cleanup: usuario de prueba, broadcast y notificaciones eliminados')
  } catch (err) {
    console.error('⚠️  Cleanup falló — elimina manualmente:', err.message)
  }
  rmSync(file, { force: true })
}

// Setup: paciente de prueba + sesión admin
let r = await api('/auth/v1/signup', { method: 'POST', body: { email: EMAIL_PAT, password: PASSWORD, data: { full_name: 'NB Paciente', role: 'patient' } } })
check('Setup: signup paciente', r.status === 200 && !!r.json?.user?.id, `status ${r.status}`)
const patLogin = (await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: EMAIL_PAT, password: PASSWORD } })).json
const patToken = patLogin?.access_token
const adminToken = HAS_ADMIN
  ? (await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })).json?.access_token
  : null
check('Setup: sesión admin', !HAS_ADMIN || !!adminToken)

// 1. CORS
r = await fn(null, null, 'OPTIONS')
check('CORS: OPTIONS → 200 con Allow-Origin', r.status === 200 && !!r.headers.get('access-control-allow-origin'), `status ${r.status}`)

// 2. Sin autenticar → 401
r = await fn({})
check('Auth: sin sesión → 401', r.status === 401, `status ${r.status}`)

// 3. Paciente (no admin) → 403
r = await fn({}, patToken)
check('Autorización: paciente (no admin) → 403', r.status === 403, `status ${r.status}`)

// 4. Método no permitido → 405
r = await fn(null, adminToken, 'GET')
check('Validación: GET → 405', r.status === 405, `status ${r.status}`)

// 5. RLS: paciente no inserta en notification_broadcasts
r = await api('/rest/v1/notification_broadcasts', {
  method: 'POST',
  token: patToken,
  body: { audience: 'all', title: 'x', body: 'x', created_by: patLogin.user.id },
})
check('RLS: paciente no inserta broadcast → 401/403', r.status === 401 || r.status === 403, `status ${r.status}`)

// 6. RLS: paciente no lee el historial
r = await api('/rest/v1/notification_broadcasts?select=id', { token: patToken })
check('RLS: paciente no lee historial → vacío/401', r.status === 401 || r.status === 403 || (r.json ?? []).length === 0, `status ${r.status}`)

// 7. dry_run: notificación de prueba solo para el admin
if (HAS_ADMIN) {
r = await fn({ dry_run: true, title: TITLE, body: 'Cuerpo de prueba E2E', link: '/paciente' }, adminToken)
check('Dry run: admin → ok', r.status === 200 && r.json?.ok === true && r.json?.dry_run === true, `status ${r.status}`)
const adminNotifs = await api(`/rest/v1/notifications?select=id&type=eq.admin_broadcast&title=eq.${encodeURIComponent(TITLE)}`, { token: adminToken })
check('Dry run: admin recibió la notificación', (adminNotifs.json ?? []).length === 1)

// 8. Paciente NO recibió la de prueba
const patNotifs = await api(`/rest/v1/notifications?select=id&title=eq.${encodeURIComponent(TITLE)}`, { token: patToken })
check('Dry run: paciente NO recibió nada', (patNotifs.json ?? []).length === 0)

// 9. Envío real: broadcast a audiencia "patients" filtrado al paciente de prueba
r = await api('/rest/v1/notification_broadcasts', {
  method: 'POST',
  token: adminToken,
  body: { audience: 'patients', title: TITLE, body: 'Cuerpo de prueba E2E', created_by: (await api('/auth/v1/user', { token: adminToken })).json?.id },
})
check('Setup: broadcast registrado (RLS admin)', r.status === 201 && !!r.json?.[0]?.id, `status ${r.status}`)
broadcastId = r.json?.[0]?.id

r = await fn({ broadcast_id: broadcastId, only_emails: [EMAIL_PAT] }, adminToken)
check('Envío real: ok con 1 destinatario', r.status === 200 && r.json?.ok === true && r.json?.recipients === 1 && r.json?.sent === 1, JSON.stringify(r.json))

// 10. El paciente de prueba la recibió
const patAfter = await api(`/rest/v1/notifications?select=title,body,link&type=eq.admin_broadcast&title=eq.${encodeURIComponent(TITLE)}`, { token: patToken })
check('Envío real: paciente recibió la notificación', (patAfter.json ?? []).length === 1 && patAfter.json[0].link === '/paciente', JSON.stringify(patAfter.json))

// 11. Contadores en el historial
r = await api(`/rest/v1/notification_broadcasts?select=status,recipient_count,sent_count&id=eq.${broadcastId}`, { token: adminToken })
const row = r.json?.[0]
check('Historial: contadores actualizados (sent)', row?.status === 'sent' && row?.recipient_count === 1 && row?.sent_count === 1, JSON.stringify(row))

// 12. Idempotencia: reenviar → 409
r = await fn({ broadcast_id: broadcastId }, adminToken)
check('Idempotencia: reenvío → 409', r.status === 409, `status ${r.status}`)

// 13. Broadcast inexistente → 404
r = await fn({ broadcast_id: '00000000-0000-0000-0000-000000000000' }, adminToken)
check('Validación: broadcast inexistente → 404', r.status === 404, `status ${r.status}`)
} else {
  console.log('… saltadas pruebas de envío (sin ADMIN_EMAIL/ADMIN_PASSWORD)')
}

cleanup()
console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
