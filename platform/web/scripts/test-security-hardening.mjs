// Prueba rápida post-migración 035: las funciones internas deben RECHAZAR al
// cliente autenticado (42501) y las RPCs del frontend deben SEGUIR funcionando.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SUPABASE_URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY

const stamp = Date.now()
const EMAIL = `sec-probe-${stamp}@test.somos-calma.com`
const PASSWORD = 'Probe#2026Secure'

let passed = 0, failed = 0
const results = []
function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: token ? `Bearer ${token}` : `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* vacío */ }
  return { status: res.status, data }
}

async function rpc(fn, args, token) {
  return api(`/rest/v1/rpc/${fn}`, { method: 'POST', token, body: args })
}

// 1. Registro (valida handle_new_user defensivo: metadata whatsapp_opt_in raro no tumba el registro)
const signup = await api('/auth/v1/signup', {
  method: 'POST',
  body: { email: EMAIL, password: PASSWORD, data: { role: 'patient', full_name: 'Probe Seguridad', whatsapp_opt_in: 'si-por-favor', timezone: 'America/Mexico_City' } },
})
check('Registro con metadata whatsapp_opt_in inválida NO falla (M5)', signup.status === 200, `status=${signup.status}`)

const login = await api('/auth/v1/token?grant_type=password', {
  method: 'POST', body: { email: EMAIL, password: PASSWORD },
})
const token = login.data?.access_token
check('Login del usuario de prueba', Boolean(token))

const uid = login.data?.user?.id
const prof = await api(`/rest/v1/professional_profiles?select=id&limit=1`, { token })
const anyProfId = prof.data?.[0]?.id

// 2. Funciones internas: deben dar 42501 (permiso denegado) o 404 según PostgREST
const revoked = {
  dispatch_user_email: { p_type: 'verification_verified', p_payload: { profile_id: uid } },
  dispatch_whatsapp: { p_type: 'appointment_booked', p_payload: { appointment_id: '00000000-0000-0000-0000-000000000000' } },
  auto_complete_past_appointments: {},
  conversation_participants: { p_conversation_id: '00000000-0000-0000-0000-000000000000' },
  can_chat: { p_patient_profile_id: '00000000-0000-0000-0000-000000000000', p_professional_profile_id: '00000000-0000-0000-0000-000000000000' },
}
for (const [fn, args] of Object.entries(revoked)) {
  const r = await rpc(fn, args, token)
  const denied = r.status === 404 || (r.data?.code === '42501') || (typeof r.data?.message === 'string' && r.data.message.includes('permission denied'))
  check(`REVOKE ${fn} rechaza al autenticado (A1)`, denied, `status=${r.status} code=${r.data?.code ?? r.data?.message ?? ''}`)
}

// 3. dispatch_reminders_cron: misma expectativa (sin args en la firma)
{
  const r = await rpc('dispatch_reminders_cron', {}, token)
  const denied = r.status === 404 || r.data?.code === '42501' || (r.data?.message ?? '').includes?.('permission denied')
  check('REVOKE dispatch_reminders_cron rechaza (A1)', denied, `status=${r.status}`)
}

// 4. RPCs del frontend deben seguir respondiendo (no 42501)
{
  const r = await rpc('get_booked_slots', { p_professional_profile_id: anyProfId, p_start: '2026-10-20T00:00:00Z', p_end: '2026-10-21T00:00:00Z' }, token)
  check('get_booked_slots sigue ejecutable (booking no roto)', r.status === 200, `status=${r.status}`)
}
{
  const r = await rpc('start_conversation', { p_counterparty_profile_id: '00000000-0000-0000-0000-000000000000' }, token)
  const callable = r.status !== 404 && r.data?.code !== '42501'
  check('start_conversation sigue ejecutable (error de negocio, no de permisos)', callable, `status=${r.status}`)
}
{
  const r = await rpc('submit_for_review', {}, token)
  const callable = r.data?.code !== '42501'
  check('submit_for_review ejecutable (error de negocio esperado: no es profesional)', callable, `status=${r.status} msg=${(r.data?.message ?? '').slice(0, 60)}`)
}

// 5. timezone persistido pese a la metadata rara (M5)
{
  const r = await api(`/rest/v1/profiles?select=timezone,whatsapp_opt_in&id=eq.${uid}`, { token })
  const row = r.data?.[0]
  check('timezone persistido en registro (M5)', row?.timezone === 'America/Mexico_City', `tz=${row?.timezone}`)
  check('whatsapp_opt_in defensivo = false con string raro', row?.whatsapp_opt_in === false, `opt_in=${row?.whatsapp_opt_in}`)
}

console.log(results.join('\n'))
console.log(`\n${passed} pasaron, ${failed} fallaron\n`)
console.log(`Usuario de prueba (BORRAR en Dashboard > Authentication): ${EMAIL} / ${PASSWORD} / uid=${uid}`)
process.exit(failed > 0 ? 1 : 0)
