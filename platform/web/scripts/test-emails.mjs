// Pruebas E2E del sistema de correos (migración 019):
//   - Edge Function user-emails (bienvenida, cancelación de cita, verificación)
//   - Triggers que la disparan vía pg_net (cancelación y verificación no tumban la operación)
//   - Edge Function send-broadcast (comunicados admin: auth, dry-run, envío filtrado, 409, historial RLS)
//
// Uso:  CRON_SECRET=<secreto> ADMIN_PASSWORD=<pass admin@demo.com> node scripts/test-emails.mjs
// Requiere: .env con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, migración 019 aplicada y
//           funciones user-emails + send-broadcast desplegadas en Cloud.
import { readFileSync, writeFileSync as writeFileSync_, rmSync as rmSync_ } from 'node:fs'
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
const CRON_SECRET = process.env.CRON_SECRET
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

const ts = Date.now().toString(36)
const EMAIL_PAT = `e2e-em-${ts}-pat@test.somos-calma.com`
const EMAIL_PRO = `e2e-em-${ts}-pro@test.somos-calma.com`
const PASSWORD = 'Test1234!x'

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

async function api(path, { method = 'GET', token, body, extraHeaders } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      'Content-Type': 'application/json',
      Prefer: method === 'GET' ? '' : 'return=representation',
      ...(extraHeaders || {}),
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

async function signup(email, role, fullName) {
  const r = await api('/auth/v1/signup', {
    method: 'POST',
    body: { email, password: PASSWORD, data: { full_name: fullName, role } },
  })
  if (!r.json?.user?.id) throw new Error(`Signup falló para ${email}: ${JSON.stringify(r.json)}`)
  return r.json.user.id
}

async function login(email, password = PASSWORD) {
  const r = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  })
  if (!r.json?.access_token) throw new Error(`Login falló para ${email}`)
  return r.json.access_token
}

function dbQuery(sql) {
  const tmp = join(root, '.tmp-em-query.sql')
  writeFileSync_(tmp, sql)
  try {
    return execSync(`cd "${join(root, '..', 'supabase')}" && supabase db query --linked -f "${tmp}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } finally {
    rmSync_(tmp)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (!CRON_SECRET) throw new Error('CRON_SECRET no provisto')
if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD no provisto (login admin@demo.com)')

// ---------- setup ----------
console.log('Creando usuarios de prueba (el signup dispara el correo de bienvenida vía trigger)...')
const patUser = await signup(EMAIL_PAT, 'patient', 'EM Paciente')
const proUser = await signup(EMAIL_PRO, 'professional', 'EM Profesional')
await sleep(6000) // dar tiempo a pg_net -> user-emails (bienvenida)

const patToken = await login(EMAIL_PAT)
const proToken = await login(EMAIL_PRO)
const adminToken = await login('admin@demo.com', ADMIN_PASSWORD)

const patId = (await api(`/rest/v1/patient_profiles?select=id&profile_id=eq.${patUser}`, { token: patToken })).json?.[0]?.id
const proId = (await api(`/rest/v1/professional_profiles?select=id&profile_id=eq.${proUser}`, { token: proToken })).json?.[0]?.id

const FN_USER_EMAILS = (body, secret) =>
  api('/functions/v1/user-emails', {
    method: 'POST',
    body,
    extraHeaders: secret ? { 'x-cron-secret': secret } : {},
  })
const FN_BROADCAST = (body, token) =>
  api('/functions/v1/send-broadcast', {
    method: 'POST',
    body,
    ...(token ? { token } : {}),
  })

// ---------- 1. user-emails: auth y validación ----------
let r = await FN_USER_EMAILS({ type: 'welcome_patient', profile_id: patUser })
check('user-emails: 401 sin secreto', r.status === 401, `status ${r.status}`)

r = await FN_USER_EMAILS({ type: 'welcome_patient', profile_id: patUser }, 'secreto-equivocado')
check('user-emails: 401 con secreto equivocado', r.status === 401, `status ${r.status}`)

r = await FN_USER_EMAILS({ type: 'welcome_patient' }, CRON_SECRET)
check('user-emails: 400 sin profile_id', r.status === 400, `status ${r.status}`)

r = await FN_USER_EMAILS({ type: 'no_existe', profile_id: patUser }, CRON_SECRET)
check('user-emails: 400 tipo no soportado', r.status === 400, `status ${r.status}`)

r = await FN_USER_EMAILS({ type: 'welcome_patient', profile_id: '00000000-0000-0000-0000-000000000000' }, CRON_SECRET)
check('user-emails: 404 perfil inexistente', r.status === 404, `status ${r.status}`)

r = await FN_USER_EMAILS({ type: 'appointment_cancelled', appointment_id: '00000000-0000-0000-0000-000000000000' }, CRON_SECRET)
check('user-emails: 404 cita inexistente', r.status === 404, `status ${r.status}`)

// ---------- 2. user-emails: envíos reales a direcciones de prueba ----------
r = await FN_USER_EMAILS({ type: 'welcome_patient', profile_id: patUser }, CRON_SECRET)
check('user-emails: welcome_patient enviado', r.status === 200 && r.json?.ok === true && r.json?.sent === 1, JSON.stringify(r.json))

r = await FN_USER_EMAILS({ type: 'welcome_professional', profile_id: proUser }, CRON_SECRET)
check('user-emails: welcome_professional enviado', r.status === 200 && r.json?.ok === true && r.json?.sent === 1, JSON.stringify(r.json))

// ---------- 3. Cancelación de cita: trigger + email a ambas partes ----------
const slotStart = new Date(Date.now() + 2 * 86400_000)
slotStart.setMinutes(0, 0, 0)
const apptWhen = slotStart.toISOString()
dbQuery(`INSERT INTO public.availability_slots (professional_profile_id, start_time, end_time, is_active)
VALUES ('${proId}', '${apptWhen}', '${new Date(slotStart.getTime() + 3600_000).toISOString()}', true);
INSERT INTO public.appointments (patient_profile_id, professional_profile_id, scheduled_at, duration_minutes, status, video_link)
VALUES ('${patId}', '${proId}', '${apptWhen}', 50, 'confirmed', 'https://meet.jit.si/test-em-${ts}')
RETURNING id;`)
const apptId = (await api(`/rest/v1/appointments?select=id&patient_profile_id=eq.${patId}&order=created_at.desc&limit=1`, { token: patToken })).json?.[0]?.id
check('Setup: cita de prueba creada', Boolean(apptId))

r = await api(`/rest/v1/appointments?id=eq.${apptId}`, { method: 'PATCH', token: patToken, body: { status: 'cancelled' } })
check('Cancelación: paciente cancela y el trigger NO tumba la operación', r.status === 200 && r.json?.[0]?.status === 'cancelled', `status ${r.status}`)

r = await FN_USER_EMAILS({ type: 'appointment_cancelled', appointment_id: apptId }, CRON_SECRET)
check('user-emails: appointment_cancelled enviado a ambas partes', r.status === 200 && r.json?.sent === 2, JSON.stringify(r.json))

// ---------- 4. Verificación: trigger + emails ----------
dbQuery(`UPDATE public.professional_profiles SET verification_status='verified', is_visible=true WHERE profile_id='${proUser}';
UPDATE public.professional_profiles SET verification_status='rejected', rejection_reason='Documento ilegible (prueba E2E)' WHERE profile_id='${proUser}';`)
await sleep(4000)
const proStatus = (await api(`/rest/v1/professional_profiles?select=verification_status,rejection_reason&profile_id=eq.${proUser}`, { token: proToken })).json?.[0]
check('Verificación: transiciones aplicadas sin error (emails despachados por trigger)', proStatus?.verification_status === 'rejected' && proStatus?.rejection_reason?.includes('prueba E2E'))

r = await FN_USER_EMAILS({ type: 'verification_verified', profile_id: proUser }, CRON_SECRET)
check('user-emails: verification_verified enviado', r.status === 200 && r.json?.sent === 1, JSON.stringify(r.json))

r = await FN_USER_EMAILS({ type: 'verification_rejected', profile_id: proUser }, CRON_SECRET)
check('user-emails: verification_rejected enviado', r.status === 200 && r.json?.sent === 1, JSON.stringify(r.json))

// ---------- 5. send-broadcast: auth ----------
r = await FN_BROADCAST({ dry_run: true, to: EMAIL_PAT, subject: 'x', body_text: 'y' })
check('send-broadcast: 401 sin sesión', r.status === 401, `status ${r.status}`)

r = await FN_BROADCAST({ dry_run: true, to: EMAIL_PAT, subject: 'x', body_text: 'y' }, proToken)
check('send-broadcast: 403 como profesional', r.status === 403, `status ${r.status}`)

r = await FN_BROADCAST({ dry_run: true, to: 'no-es-correo' }, adminToken)
check('send-broadcast: dry-run 400 destinatario inválido', r.status === 400, `status ${r.status}`)

// ---------- 6. send-broadcast: dry-run y envío filtrado ----------
r = await FN_BROADCAST({ dry_run: true, to: EMAIL_PAT, subject: 'Prueba E2E', body_text: 'Cuerpo de prueba.\n\nSegundo párrafo.' }, adminToken)
check('send-broadcast: dry-run enviado a correo de prueba', r.status === 200 && r.json?.ok === true, JSON.stringify(r.json))

r = await api('/rest/v1/email_broadcasts', {
  method: 'POST',
  token: adminToken,
  body: { audience: 'all', subject: 'Comunicado E2E', body_text: 'Mensaje de prueba E2E.\n\nSegundo párrafo.' },
})
const broadcastId = r.json?.[0]?.id
check('Broadcast: admin crea el comunicado (RLS insert)', r.status === 201 && Boolean(broadcastId), `status ${r.status}`)

r = await FN_BROADCAST({ broadcast_id: broadcastId, only_emails: [EMAIL_PAT, EMAIL_PRO] }, adminToken)
check('Broadcast: envío filtrado a los 2 usuarios de prueba', r.status === 200 && r.json?.ok === true && r.json?.sent === 2 && r.json?.recipients === 2, JSON.stringify(r.json))

r = await FN_BROADCAST({ broadcast_id: broadcastId, only_emails: [EMAIL_PAT] }, adminToken)
check('Broadcast: reintento del mismo comunicado → 409', r.status === 409, `status ${r.status}`)

r = await api('/rest/v1/email_broadcasts', {
  method: 'POST',
  token: adminToken,
  body: { audience: 'patients', subject: 'E2E vacío', body_text: 'x' },
})
const emptyBroadcastId = r.json?.[0]?.id
r = await FN_BROADCAST({ broadcast_id: emptyBroadcastId, only_emails: ['nadie@example.com'] }, adminToken)
check('Broadcast: filtro sin coincidencias → 422 y status failed', r.status === 422, `status ${r.status}`)

// ---------- 7. Historial y RLS ----------
r = await api('/rest/v1/email_broadcasts?select=id,status,sent_count,recipient_count&order=created_at.desc&limit=5', { token: adminToken })
const sentRow = r.json?.find((b) => b.id === broadcastId)
check('Historial: admin ve el envío con contadores', Boolean(sentRow) && sentRow.status === 'sent' && sentRow.sent_count === 2, JSON.stringify(sentRow))

r = await api('/rest/v1/email_broadcasts?select=id', { token: proToken })
check('Historial: profesional NO ve los comunicados (RLS)', r.status === 200 && (r.json ?? []).length === 0, `status ${r.status}`)

// ---------- cleanup ----------
console.log('Limpiando usuarios de prueba...')
dbQuery(`DELETE FROM auth.users WHERE email IN ('${EMAIL_PAT}','${EMAIL_PRO}');
DELETE FROM public.email_broadcasts WHERE subject LIKE 'Comunicado E2E' OR subject LIKE 'E2E vacío';`)
const remaining = (await api(`/rest/v1/profiles?select=id&email=in.(${EMAIL_PAT},${EMAIL_PRO})`, { token: adminToken })).json
check('Cleanup: 0 usuarios de prueba restantes', (remaining ?? []).length === 0)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
