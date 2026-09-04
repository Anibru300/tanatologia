// Pruebas E2E de las funciones de la migración 013:
//   - Encuesta de registro (intake) del paciente
//   - Reseñas profesionales públicas (paciente → profesional) con rating agregado
//   - Calificación privada de paciente (profesional → paciente)
//   - Edge Function appointment-reminders (email + notificación in-app, 24h y 15m)
//
// Uso:  CRON_SECRET=<secreto> node scripts/test-features-013.mjs
// Requiere: .env con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY y CLI supabase vinculada.
import { readFileSync } from 'node:fs'
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

const ts = Date.now().toString(36)
const EMAIL_PAT = `e2e-f13-${ts}-pat@test.somos-calma.com`
const EMAIL_P1 = `e2e-f13-${ts}-p1@test.somos-calma.com`
const EMAIL_P2 = `e2e-f13-${ts}-p2@test.somos-calma.com`
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

async function login(email) {
  const r = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password: PASSWORD },
  })
  if (!r.json?.access_token) throw new Error(`Login falló para ${email}`)
  return r.json.access_token
}

function dbQuery(sql) {
  // El CLI escapa mejor desde archivo temporal
  const tmp = join(root, '.tmp-f13-query.sql')
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
import { writeFileSync as writeFileSync_, rmSync as rmSync_ } from 'node:fs'

// ---------- setup ----------
console.log('Creando usuarios de prueba...')
const patUser = await signup(EMAIL_PAT, 'patient', 'F13 Paciente')
const p1User = await signup(EMAIL_P1, 'professional', 'F13 Pro Uno')
const p2User = await signup(EMAIL_P2, 'professional', 'F13 Pro Dos')

console.log('Verificando profesionales (workaround trigger)...')
dbQuery(`ALTER TABLE public.professional_profiles DISABLE TRIGGER USER;
UPDATE public.professional_profiles SET verification_status='verified', is_visible=true
WHERE profile_id IN ('${p1User}','${p2User}');
ALTER TABLE public.professional_profiles ENABLE TRIGGER USER;
SELECT count(*) FROM public.professional_profiles WHERE verification_status='verified' AND profile_id IN ('${p1User}','${p2User}');`)

const patToken = await login(EMAIL_PAT)
const p1Token = await login(EMAIL_P1)
const p2Token = await login(EMAIL_P2)

const patId = (await api(`/rest/v1/patient_profiles?select=id&profile_id=eq.${patUser}`, { token: patToken })).json?.[0]?.id
const p1Id = (await api(`/rest/v1/professional_profiles?select=id&profile_id=eq.${p1User}`, { token: p1Token })).json?.[0]?.id
const p2Id = (await api(`/rest/v1/professional_profiles?select=id&profile_id=eq.${p2User}`, { token: p2Token })).json?.[0]?.id

// ---------- 1. Encuesta de registro ----------
const intake = {
  needType: 'duelo',
  topics: ['duelo_muerte', 'ansiedad'],
  therapistGender: 'mujer',
  preferredTime: 'tarde',
  firstTherapy: 'si',
  reasonText: 'Perdí a mi mamá hace unos meses.',
  screeningDone: true,
  phq9: [1, 1, 2, 1, 0, 1, 1, 0, 0],
  gad7: [2, 1, 2, 1, 0, 1, 1],
}
let r = await api(`/rest/v1/patient_profiles?profile_id=eq.${patUser}&select=id,intake_completed_at`, {
  method: 'PATCH',
  token: patToken,
  body: { intake, intake_completed_at: new Date().toISOString() },
})
check('Intake: paciente guarda su encuesta', r.status === 200 && !!r.json?.[0]?.intake_completed_at, `status ${r.status}`)
const intakeSaved = (await api(`/rest/v1/patient_profiles?select=intake&profile_id=eq.${patUser}`, { token: patToken })).json?.[0]?.intake
check('Intake: respuestas persistidas (PHQ-9 item 9 = 0)', intakeSaved?.phq9?.[8] === 0 && intakeSaved?.needType === 'duelo')

// Paciente ajeno NO puede guardar el intake de otro
r = await api(`/rest/v1/patient_profiles?profile_id=eq.${patUser}`, {
  method: 'PATCH',
  token: p1Token,
  body: { intake: { needType: 'hackeado' } },
})
check('Intake: profesional no puede editar intake ajeno', r.status === 401 || r.status === 403 || (Array.isArray(r.json) && r.json.length === 0), `status ${r.status}`)

// ---------- 2. Reseña paciente → profesional ----------
const day = 2 * 86400_000
const slotStart = new Date(Date.now() + day)
slotStart.setMinutes(0, 0, 0)
const slotEnd = new Date(slotStart.getTime() + 60 * 60_000)
r = await api('/rest/v1/availability_slots?select=id', {
  method: 'POST',
  token: p1Token,
  body: { professional_profile_id: p1Id, slot_start: slotStart.toISOString(), slot_end: slotEnd.toISOString() },
})
check('Setup: slot publicado', r.status === 201, `status ${r.status}`)

const apptStart = new Date(slotStart.getTime() + 5 * 60_000)
r = await api('/rest/v1/appointments?select=id', {
  method: 'POST',
  token: patToken,
  body: {
    patient_profile_id: patId,
    professional_profile_id: p1Id,
    scheduled_at: apptStart.toISOString(),
    duration_minutes: 50,
    session_type: 'single',
    status: 'confirmed',
  },
})
const appt1 = r.json?.[0]?.id
check('Setup: cita agendada', r.status === 201 && !!appt1, `status ${r.status}`)

r = await api(`/rest/v1/appointments?id=eq.${appt1}`, { method: 'PATCH', token: p1Token, body: { status: 'completed' } })
check('Setup: cita completada por el profesional', r.status === 200, `status ${r.status}`)

r = await api('/rest/v1/professional_reviews?select=id', {
  method: 'POST',
  token: patToken,
  body: { professional_profile_id: p1Id, patient_profile_id: patId, appointment_id: appt1, rating: 5, comment: 'Me ayudó muchísimo.' },
})
check('Reseña: paciente califica al profesional (5★)', r.status === 201, `status ${r.status}`)

const p1Profile = (await api(`/rest/v1/professional_profiles?select=rating,rating_count&profile_id=eq.${p1User}`, { token: patToken })).json?.[0]
check('Reseña: rating agregado del profesional = 5.0 (count 1)', Number(p1Profile?.rating) === 5 && Number(p1Profile?.rating_count) === 1, JSON.stringify(p1Profile))

r = await api('/rest/v1/professional_reviews?select=id', {
  method: 'POST',
  token: patToken,
  body: { professional_profile_id: p1Id, patient_profile_id: patId, appointment_id: appt1, rating: 1 },
})
check('Reseña: duplicado en la misma cita rechazado', r.status === 409 || r.status === 400, `status ${r.status}`)

r = await api('/rest/v1/professional_reviews?select=id', {
  method: 'POST',
  token: patToken,
  body: { professional_profile_id: p2Id, patient_profile_id: patId, appointment_id: appt1, rating: 5 },
})
check('Reseña: cita ajena al profesional rechazada (trigger)', r.status === 400 || r.status === 409, `status ${r.status}`)

// Vista pública: paciente autenticado la ve; anónimo no
r = await api(`/rest/v1/professional_reviews_public?professional_profile_id=eq.${p1Id}&select=rating,comment`)
check('Reseña: vista pública anónima NO legible sin sesión', r.status === 401, `status ${r.status}`)
r = await api(`/rest/v1/professional_reviews_public?professional_profile_id=eq.${p1Id}&select=rating,comment`, { token: patToken })
check('Reseña: vista pública legible autenticada (sin paciente expuesto)', r.status === 200 && r.json?.length === 1 && r.json[0].comment === 'Me ayudó muchísimo.' && r.json[0].patient_profile_id === undefined, JSON.stringify(r.json))

// ---------- 3. Calificación profesional → paciente (privada) ----------
r = await api('/rest/v1/patient_reviews?select=id', {
  method: 'POST',
  token: p1Token,
  body: { patient_profile_id: patId, professional_profile_id: p1Id, appointment_id: appt1, rating: 4, comment: 'Asiste puntual y con buena disposición.' },
})
check('Paciente-review: profesional califica a su paciente (4★)', r.status === 201, `status ${r.status}`)

const patProfile = (await api(`/rest/v1/patient_profiles?select=rating,rating_count&profile_id=eq.${patUser}`, { token: patToken })).json?.[0]
check('Paciente-review: rating agregado del paciente = 4.0 (count 1)', Number(patProfile?.rating) === 4 && Number(patProfile?.rating_count) === 1, JSON.stringify(patProfile))

// El profesional SIN cita con ese paciente no la ve
r = await api(`/rest/v1/patient_reviews?patient_profile_id=eq.${patId}&select=rating`, { token: p2Token })
check('Paciente-review: colega sin cita no ve la calificación', r.status === 200 && r.json?.length === 0, `status ${r.status} rows ${r.json?.length}`)

// El profesional CON cita sí la ve
r = await api(`/rest/v1/patient_reviews?patient_profile_id=eq.${patId}&select=rating,comment`, { token: p1Token })
check('Paciente-review: profesional con cita sí la ve', r.status === 200 && r.json?.length === 1 && Number(r.json[0].rating) === 4, JSON.stringify(r.json))

// Paciente no puede calificar al profesional por esa cita (no es su rol)
r = await api('/rest/v1/patient_reviews?select=id', {
  method: 'POST',
  token: patToken,
  body: { patient_profile_id: patId, professional_profile_id: p1Id, appointment_id: appt1, rating: 5 },
})
check('Paciente-review: paciente no puede insertar (RLS/trigger)', r.status === 401 || r.status === 403 || r.status === 400, `status ${r.status}`)

// ---------- 4. Recordatorios (Edge Function) ----------
const remSlotStart = new Date(Date.now() + 10 * 60_000)
const remSlotEnd = new Date(remSlotStart.getTime() + 90 * 60_000)
r = await api('/rest/v1/availability_slots?select=id', {
  method: 'POST',
  token: p1Token,
  body: { professional_profile_id: p1Id, slot_start: remSlotStart.toISOString(), slot_end: remSlotEnd.toISOString() },
})
check('Recordatorios: slot publicado (cita en ~20 min)', r.status === 201, `status ${r.status}`)

const remApptStart = new Date(Date.now() + 20 * 60_000)
r = await api('/rest/v1/appointments?select=id', {
  method: 'POST',
  token: patToken,
  body: {
    patient_profile_id: patId,
    professional_profile_id: p1Id,
    scheduled_at: remApptStart.toISOString(),
    duration_minutes: 50,
    session_type: 'single',
    status: 'confirmed',
  },
})
const appt2 = r.json?.[0]?.id
check('Recordatorios: cita en ventana de 15 min agendada', r.status === 201 && !!appt2, `status ${r.status}`)

if (CRON_SECRET) {
  r = await fetch(`${SUPABASE_URL}/functions/v1/appointment-reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
    body: '{}',
  }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => null) }))
  check('Recordatorios: función responde ok', r.status === 200 && r.json?.ok === true, `status ${r.status} ${JSON.stringify(r.json)}`)
  check('Recordatorios: notificaciones in-app creadas (≥2)', (r.json?.notifications ?? 0) >= 2, `notifications=${r.json?.notifications}`)

  const flags = (await api(`/rest/v1/appointments?select=id,reminder_15m_sent,reminder_24h_sent&id=in.(${appt1},${appt2})`, { token: patToken })).json
  const a2 = flags?.find((a) => a.id === appt2)
  const a1 = flags?.find((a) => a.id === appt1)
  check('Recordatorios: flag 15m marcado SOLO en la cita próxima', a2?.reminder_15m_sent === true && a1?.reminder_15m_sent === false, JSON.stringify(flags))

  const notifs = (await api(`/rest/v1/notifications?select=type,title&profile_id=eq.${patUser}&type=eq.appointment_reminder&order=created_at.desc&limit=1`, { token: patToken })).json
  check('Recordatorios: "alarma" in-app visible para el paciente', notifs?.length === 1 && /15 minutos|mañana/.test(notifs[0].title), JSON.stringify(notifs))
} else {
  check('Recordatorios: función invocada (CRON_SECRET provisto)', false, 'CRON_SECRET no definido')
}

r = await fetch(`${SUPABASE_URL}/functions/v1/appointment-reminders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
}).then(async (res) => ({ status: res.status, json: await res.json().catch(() => null) }))
check('Recordatorios: sin secreto responde 401', r.status === 401, `status ${r.status}`)

// ---------- cleanup ----------
console.log('Limpiando usuarios de prueba...')
const cleanupOut = dbQuery(`DELETE FROM auth.users WHERE email LIKE 'e2e-f13-${ts}-%@test.somos-calma.com';
SELECT count(*) AS restantes FROM auth.users WHERE email LIKE 'e2e-f13-${ts}-%@test.somos-calma.com';`)
check('Cleanup: 0 usuarios de prueba restantes', /│ 0\s+│/.test(cleanupOut), cleanupOut.split('\n').filter((l) => l.includes('restantes') || l.includes('│ 0')).join(' '))

console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
