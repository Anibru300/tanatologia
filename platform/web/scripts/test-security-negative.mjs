// Pruebas de seguridad negativas (Tests A–I del audit pre-Beta) contra Supabase Cloud.
// Uso:
//   1) SETUP_ONLY=1 node scripts/test-security-negative.mjs   → crea 4 usuarios de prueba
//   2) Marcar profesional A verified (SQL):
//        alter table public.professional_profiles disable trigger enforce_professional_profile_update_restrictions;
//        update public.professional_profiles set verification_status='verified', is_visible=true
//          where profile_id in (select id from auth.users where email='e2e-sec-pro-a-20260903@test.somos-calma.com');
//        alter table public.professional_profiles enable trigger enforce_professional_profile_update_restrictions;
//   3) node scripts/test-security-negative.mjs                → corre los Tests A–I
//   4) delete from auth.users where email like 'e2e-sec-%@test.somos-calma.com';
import { readFileSync } from 'node:fs'
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
const PASSWORD = 'E2eSec#2026Test'
const EMAILS = {
  patA: 'e2e-sec-paciente-a-20260903@test.somos-calma.com',
  patB: 'e2e-sec-paciente-b-20260903@test.somos-calma.com',
  proA: 'e2e-sec-pro-a-20260903@test.somos-calma.com',
  proB: 'e2e-sec-pro-b-20260903@test.somos-calma.com',
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      'Content-Type': 'application/json',
      Prefer: method === 'GET' ? '' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch { /* sin cuerpo */ }
  return { status: res.status, json }
}

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

// ---------- SETUP ----------
if (process.env.SETUP_ONLY) {
  for (const [key, email] of Object.entries(EMAILS)) {
    const role = key.startsWith('pro') ? 'professional' : 'patient'
    const r = await api('/auth/v1/signup', {
      method: 'POST',
      body: { email, password: PASSWORD, data: { full_name: `E2E Sec ${key}`, role } },
    })
    console.log(email, r.status === 200 && r.json?.access_token ? 'OK' : `FALLO ${JSON.stringify(r.json)?.slice(0, 100)}`)
  }
  process.exit(0)
}

const login = async (email) => {
  const r = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: PASSWORD } })
  if (!r.json?.access_token) throw new Error(`login falló: ${email}`)
  return r.json.access_token
}
const tok = {
  patA: await login(EMAILS.patA),
  patB: await login(EMAILS.patB),
  proA: await login(EMAILS.proA),
  proB: await login(EMAILS.proB),
}
const uid = async (t) => (await api('/auth/v1/user', { token: t })).json?.id
const patAId = await uid(tok.patA)
const patBId = await uid(tok.patB)
const proAUserId = await uid(tok.proA)
const proBUserId = await uid(tok.proB)
const sub = async (t, table, userId) =>
  (await api(`/rest/v1/${table}?select=id&profile_id=eq.${userId}`, { token: t })).json?.[0]?.id
const patBProfileId = await sub(tok.patB, 'patient_profiles', patBId)
const proAProfileId = await sub(tok.proA, 'professional_profiles', proAUserId)
const proBProfileId = await sub(tok.proB, 'professional_profiles', proBUserId)

// ---------- Test A: paciente A accede a información del paciente B ----------
let r = await api(`/rest/v1/profiles?select=id,email&id=eq.${patBId}`, { token: tok.patA })
check('A1: paciente A no lee perfil del paciente B', (r.json ?? []).length === 0, `${r.json?.length ?? 0} filas`)
r = await api(`/rest/v1/patient_profiles?select=id&profile_id=eq.${patBId}`, { token: tok.patA })
check('A2: paciente A no lee subperfil del paciente B', (r.json ?? []).length === 0)
r = await api(`/rest/v1/appointments?select=id&patient_profile_id=eq.${patBProfileId}`, { token: tok.patA })
check('A3: paciente A no lee citas del paciente B', (r.json ?? []).length === 0)

// ---------- Test B: profesional A accede a documentos del profesional B ----------
r = await api(`/rest/v1/professional_documents?select=id&professional_profile_id=eq.${proBProfileId}`, { token: tok.proA })
check('B: profesional A no lee documentos del profesional B', (r.json ?? []).length === 0)

// ---------- Test C: profesional intenta role=admin ----------
r = await api(`/rest/v1/profiles?id=eq.${proAUserId}`, { method: 'PATCH', token: tok.proA, body: { role: 'admin' } })
const roleAfter = (await api(`/rest/v1/profiles?select=role&id=eq.${proAUserId}`, { token: tok.proA })).json?.[0]?.role
check('C: profesional NO puede cambiar su role a admin', roleAfter === 'professional', `role=${roleAfter}`)

// ---------- Test D: profesional intenta auto-verificarse ----------
r = await api(`/rest/v1/professional_profiles?id=eq.${proBProfileId}`, { method: 'PATCH', token: tok.proB, body: { verification_status: 'verified' } })
const verifAfter = (await api(`/rest/v1/professional_profiles?select=verification_status&id=eq.${proBProfileId}`, { token: tok.proB })).json?.[0]?.verification_status
check('D: profesional NO puede auto-verificarse', verifAfter !== 'verified', `status=${verifAfter}`)

// ---------- Tests E/F: paciente/profesional acceden a datos de administración ----------
r = await api('/rest/v1/audit_logs?select=id&limit=5', { token: tok.patA })
check('E1: paciente no lee audit_logs', (r.json ?? []).length === 0)
r = await api('/rest/v1/audit_logs?select=id&limit=5', { token: tok.proA })
check('F1: profesional no lee audit_logs', (r.json ?? []).length === 0)
r = await api('/rest/v1/profiles?select=id', { token: tok.patA })
check('E2: paciente solo se ve a sí mismo en profiles', (r.json ?? []).length === 1)
r = await api('/rest/v1/feedback?select=id', { token: tok.patA })
check('E3: paciente solo ve su propio feedback', (r.json ?? []).length === 0)

// ---------- Test G: anónimo ----------
r = await api('/rest/v1/profiles?select=id')
check('G1: anónimo no lista profiles', (r.json ?? []).length === 0)
r = await api('/rest/v1/appointments?select=id')
check('G2: anónimo no lista citas', (r.json ?? []).length === 0)
r = await api('/rest/v1/feedback?select=id')
check('G3: anónimo no lista feedback', (r.json ?? []).length === 0)

// ---------- Test H: manipulación de IDs (cita ajena) ----------
// El profesional A (verified) publica un slot; el paciente B agenda; el paciente A intenta tocarla.
// Limpieza de slots propios previos (re-ejecuciones del script)
await api(`/rest/v1/availability_slots?professional_profile_id=eq.${proAProfileId}`, { method: 'DELETE', token: tok.proA })
const base = new Date(Date.now() + 2 * 86400_000)
base.setMinutes(0, 0, 0)
base.setTime(base.getTime() + (Date.now() % 600) * 60_000)
const slotStart = new Date(base.getTime() + 14 * 3600_000)
r = await api('/rest/v1/availability_slots?select,id', {})
r = await api('/rest/v1/availability_slots?select=id,slot_start,slot_end', {
  method: 'POST',
  token: tok.proA,
  body: { professional_profile_id: proAProfileId, slot_start: slotStart.toISOString(), slot_end: new Date(slotStart.getTime() + 50 * 60_000).toISOString() },
})
const slot = r.json?.[0]
r = await api('/rest/v1/appointments?select=id,patient_profile_id', {
  method: 'POST',
  token: tok.patB,
  body: { patient_profile_id: patBProfileId, professional_profile_id: proAProfileId, scheduled_at: slot.slot_start, duration_minutes: 50, session_type: 'single' },
})
const apptB = r.json?.[0]
check('H0: setup — paciente B agenda con profesional A', r.status === 201, `status ${r.status}`)
r = await api(`/rest/v1/appointments?id=eq.${apptB.id}&select=status`, { method: 'PATCH', token: tok.patA, body: { status: 'cancelled' } })
const stAfter = (await api(`/rest/v1/appointments?id=eq.${apptB.id}&select=status,patient_profile_id`, { token: tok.patB })).json?.[0]
check('H1: paciente A NO puede cancelar la cita del paciente B', stAfter?.status !== 'cancelled', `status=${stAfter?.status}`)
r = await api(`/rest/v1/appointments?select=id&patient_profile_id=eq.${patBProfileId}`, { token: tok.patA })
check('H2: paciente A no lee la cita aunque conozca el ID del dueño', (r.json ?? []).length === 0)
r = await api(`/rest/v1/appointments?id=eq.${apptB.id}&select=status`, { method: 'PATCH', token: tok.proB, body: { status: 'confirmed' } })
const stProB = (await api(`/rest/v1/appointments?id=eq.${apptB.id}&select=status`, { token: tok.patB })).json?.[0]?.status
check('H3: profesional B NO puede modificar la cita del profesional A', stProB !== 'confirmed', `status=${stProB}`)

// ---------- Test I: Storage de documentos ----------
// I1: paciente intenta subir al bucket privado
const fakeDoc = Buffer.from('documento de prueba').toString('base64')
r = await fetch(`${SUPABASE_URL}/storage/v1/object/professional-documents/${patAId}/ine.pdf`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${tok.patA}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
  body: Buffer.from(fakeDoc, 'base64'),
})
check('I1: paciente NO puede subir documentos al bucket profesional', r.status >= 400, `status ${r.status}`)
// I2: profesional B intenta subir a la carpeta del profesional A (suplantación de carpeta)
r = await fetch(`${SUPABASE_URL}/storage/v1/object/professional-documents/${proAUserId}/ine.pdf`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${tok.proB}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
  body: Buffer.from(fakeDoc, 'base64'),
})
check('I2: profesional B NO puede subir a la carpeta del profesional A', r.status >= 400, `status ${r.status}`)
// I3: anónimo intenta leer un objeto del bucket
r = await fetch(`${SUPABASE_URL}/storage/v1/object/professional-documents/${proAUserId}/ine.pdf`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
})
check('I3: anónimo NO puede descargar documentos aunque conozca la ruta', r.status >= 400, `status ${r.status}`)
// I4: profesional A sube su propio documento (positivo) y profesional B intenta leerlo
r = await fetch(`${SUPABASE_URL}/storage/v1/object/professional-documents/${proAUserId}/cedula-e2e.pdf`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${tok.proA}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
  body: Buffer.from(fakeDoc, 'base64'),
})
check('I4: profesional A sí puede subir su propio documento', r.status === 200 || r.status === 201, `status ${r.status}`)
r = await fetch(`${SUPABASE_URL}/storage/v1/object/professional-documents/${proAUserId}/cedula-e2e.pdf`, {
  headers: { apikey: ANON, Authorization: `Bearer ${tok.proB}` },
})
check('I5: profesional B NO puede descargar el documento del profesional A', r.status >= 400, `status ${r.status}`)

console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
