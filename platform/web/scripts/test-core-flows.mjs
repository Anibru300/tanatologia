// Pruebas E2E de los flujos centrales de la Beta contra Supabase Cloud.
// Uso:
//   1) node -e "..." (registrar usuarios, ver abajo) o registrar previamente
//   2) Marcar el profesional como verified + visible (SQL, ver docs/AGENTS.md):
//        UPDATE public.professional_profiles SET verification_status='verified', is_visible=true
//        WHERE profile_id = (SELECT id FROM auth.users WHERE email='<EMAIL_PRO>');
//   3) TEST_PATIENT_EMAIL=... TEST_PRO_EMAIL=... TEST_PASSWORD=... node scripts/test-core-flows.mjs
//   4) Borrar usuarios de prueba (SQL):
//        DELETE FROM auth.users WHERE email LIKE 'e2e-core-%@test.somos-calma.com';
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

const EMAIL_PATIENT = process.env.TEST_PATIENT_EMAIL
const EMAIL_PRO = process.env.TEST_PRO_EMAIL
const PASSWORD = process.env.TEST_PASSWORD
if (!EMAIL_PATIENT || !EMAIL_PRO || !PASSWORD) {
  console.error('FALTAN TEST_PATIENT_EMAIL / TEST_PRO_EMAIL / TEST_PASSWORD')
  process.exit(1)
}

let passed = 0
let failed = 0
const results = []
function check(name, ok, detail = '') {
  const line = `${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`
  results.push(line)
  console.log(line)
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
      Prefer: method === 'GET' ? '' : 'return=representation',
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

async function login(email) {
  const r = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password: PASSWORD },
  })
  if (!r.json?.access_token) throw new Error(`Login falló para ${email}: ${JSON.stringify(r.json)}`)
  return r.json.access_token
}

// Slots: pasado mañana + offset único por corrida (evita colisiones EXCLUDE en re-ejecuciones)
const base = new Date(Date.now() + 2 * 86400_000)
base.setMinutes(0, 0, 0)
const runOffset = (Date.now() % 600) * 60_000 // 0–10 h, siempre dentro del día
base.setTime(base.getTime() + runOffset)
const iso = (d) => d.toISOString()
const slotA_start = new Date(base.getTime() + 10 * 3600_000) // 10:00
const slotA_end = new Date(slotA_start.getTime() + 50 * 60_000) // 50 min
const slotB_start = new Date(base.getTime() + 11 * 3600_000) // 11:00
const slotB_end = new Date(slotB_start.getTime() + 60 * 60_000) // 60 min

const patientToken = await login(EMAIL_PATIENT)
const proToken = await login(EMAIL_PRO)

// IDs de subperfiles (filtrados por el usuario propio: el directorio de
// profesionales verificados también es legible vía RLS, json[0] podría ser ajeno)
const mePro = (await api('/auth/v1/user', { token: proToken })).json
const mePat = (await api('/auth/v1/user', { token: patientToken })).json
const proId = (
  await api(`/rest/v1/professional_profiles?select=id&profile_id=eq.${mePro.id}`, { token: proToken })
).json?.[0]?.id
const patId = (
  await api(`/rest/v1/patient_profiles?select=id&profile_id=eq.${mePat.id}`, { token: patientToken })
).json?.[0]?.id

if (!proId || !patId) {
  console.error('No se encontraron subperfiles (¿usuarios registrados y profesional verificado?)')
  process.exit(1)
}

// --- Bloque 4: disponibilidad y booking ---
let r = await api('/rest/v1/availability_slots?select=id,slot_start,slot_end', {
  method: 'POST',
  token: proToken,
  body: { professional_profile_id: proId, slot_start: iso(slotA_start), slot_end: iso(slotA_end) },
})
check('B4: profesional publica slot de 50 min', r.status === 201, `status ${r.status}`)
const _slotA = r.json?.[0]

r = await api('/rest/v1/availability_slots?select=id', {
  method: 'POST',
  token: proToken,
  body: { professional_profile_id: proId, slot_start: iso(slotB_start), slot_end: iso(slotB_end) },
})
check('B4: profesional publica segundo slot', r.status === 201, `status ${r.status}`)
const _slotB = r.json?.[0]

r = await api('/rest/v1/availability_slots?select=id', {
  method: 'POST',
  token: proToken,
  body: {
    professional_profile_id: proId,
    slot_start: iso(new Date(slotA_start.getTime() + 30 * 60_000)),
    slot_end: iso(new Date(slotA_start.getTime() + 80 * 60_000)),
  },
})
check('B4/ACID: slot traslapado rechazado (EXCLUDE)', r.status >= 400, `status ${r.status}`)

r = await api(`/rest/v1/availability_slots?select=id&professional_profile_id=eq.${proId}`, {
  token: patientToken,
})
check('B4: paciente lee slots de profesional verificado', r.status === 200 && (r.json?.length ?? 0) >= 2, `${r.json?.length} slots`)

// --- Bloque 3/4: agendar ---
r = await api('/rest/v1/appointments?select=id,status,video_link', {
  method: 'POST',
  token: patientToken,
  body: {
    patient_profile_id: patId,
    professional_profile_id: proId,
    scheduled_at: iso(slotA_start),
    duration_minutes: 50,
    session_type: 'single',
  },
})
check('B4: paciente agenda en slot publicado', r.status === 201, `status ${r.status}`)
const apptA = r.json?.[0]
check('B3: la cita genera video_link (Jitsi)', !!apptA?.video_link, apptA?.video_link ? 'link generado' : 'sin link')

r = await api('/rest/v1/appointments?select=id', {
  method: 'POST',
  token: patientToken,
  body: {
    patient_profile_id: patId,
    professional_profile_id: proId,
    scheduled_at: iso(new Date(slotB_start.getTime() + 45 * 60_000)), // 11:45, traslapa cita A (10:00–10:50)? no, pero sí prueba EXCLUDE con otra cita
    duration_minutes: 50,
    session_type: 'single',
  },
})
// 11:45 no traslapa con A (10:00–10:50); es válido si cabe en slot B (11:00–12:00): 11:45+50=12:35 > 12:00 → debe fallar por slot
check('B9: cita fuera del slot publicado rechazada', r.status >= 400, `status ${r.status}`)

r = await api('/rest/v1/appointments?select=id', {
  method: 'POST',
  token: patientToken,
  body: {
    patient_profile_id: patId,
    professional_profile_id: proId,
    scheduled_at: iso(new Date(slotA_start.getTime() + 10 * 60_000)), // 10:10, traslapa cita A activa
    duration_minutes: 50,
    session_type: 'single',
  },
})
check('B9/ACID: doble-reserva del mismo horario rechazada (EXCLUDE)', r.status >= 400, `status ${r.status}`)

r = await api('/rest/v1/appointments?select=id', {
  method: 'POST',
  token: patientToken,
  body: {
    patient_profile_id: patId,
    professional_profile_id: proId,
    scheduled_at: iso(slotB_start),
    duration_minutes: 50,
    session_type: 'single',
  },
})
check('B4: segunda cita en slot B', r.status === 201, `status ${r.status}`)
const apptB = r.json?.[0]

// --- Bloque 4: RPC horarios ocupados ---
const rangeStart = iso(new Date(base.getTime()))
const rangeEnd = iso(new Date(base.getTime() + 24 * 3600_000))
r = await api(
  `/rest/v1/rpc/get_booked_slots?p_professional_profile_id=${proId}&p_start=${encodeURIComponent(rangeStart)}&p_end=${encodeURIComponent(rangeEnd)}`,
  { token: patientToken }
)
check('B4: get_booked_slots muestra 2 citas activas', r.status === 200 && r.json?.length === 2, `${r.json?.length} citas`)

// --- Bloque 6: notificaciones ---
r = await api('/rest/v1/notifications?select=id,type&order=created_at.desc&limit=10', { token: patientToken })
const notifTypes = (r.json ?? []).map((n) => n.type)
check(
  'B6: agendar crea notificación al paciente',
  notifTypes.some((t) => t?.startsWith('appointment_')),
  notifTypes.join(',') || 'sin notificaciones'
)

// --- Bloque 6: confirmar y cancelar ---
r = await api(`/rest/v1/appointments?id=eq.${apptA.id}&select=id,status`, {
  method: 'PATCH',
  token: proToken,
  body: { status: 'confirmed' },
})
check('B6: profesional confirma su cita', r.status === 200 && r.json?.[0]?.status === 'confirmed', `status ${r.status}`)

r = await api(`/rest/v1/appointments?id=eq.${apptB.id}&select=id,status`, {
  method: 'PATCH',
  token: patientToken,
  body: { status: 'cancelled' },
})
check('B4: paciente cancela su cita', r.status === 200 && r.json?.[0]?.status === 'cancelled', `status ${r.status}`)

r = await api(
  `/rest/v1/rpc/get_booked_slots?p_professional_profile_id=${proId}&p_start=${encodeURIComponent(rangeStart)}&p_end=${encodeURIComponent(rangeEnd)}`,
  { token: patientToken }
)
check('B4: cancelar libera el horario (solo 1 activa)', r.status === 200 && r.json?.length === 1, `${r.json?.length} activas`)

r = await api('/rest/v1/notifications?select=id,type&order=created_at.desc&limit=5', { token: patientToken })
const lastTypes = (r.json ?? []).map((n) => n.type)
check(
  'B6: cancelar crea notificación al paciente',
  lastTypes.some((t) => t?.includes('cancel')),
  lastTypes.join(',') || 'sin notificaciones'
)

// --- Bloque 6: notas clínicas ---
r = await api('/rest/v1/clinical_notes?select=id', {
  method: 'POST',
  token: proToken,
  body: { professional_profile_id: proId, patient_profile_id: patId, appointment_id: apptA.id, content: 'Nota E2E de prueba (borrar)' },
})
check('B6: profesional escribe nota clínica en su cita', r.status === 201, `status ${r.status}`)

r = await api('/rest/v1/clinical_notes?select=id', { token: patientToken })
check('B6: paciente NO ve notas clínicas (RLS)', r.status === 200 && (r.json?.length ?? 0) === 0, `${r.json?.length ?? 0} notas visibles`)

// --- Bloque 10: feedback ---
r = await api('/rest/v1/feedback?select=id,role,type,status', {
  method: 'POST',
  token: patientToken,
  body: { profile_id: mePat.id, type: 'general', rating: 5, comment: 'Prueba E2E del sistema de feedback (borrar)' },
})
check('B10: paciente envía feedback', r.status === 201, `status ${r.status}`)
const fb = r.json?.[0]
check('B10: trigger fija role=patient (no el cliente)', fb?.role === 'patient', `role=${fb?.role}`)

r = await api('/rest/v1/feedback?select=id&comment=like.*E2E*', { token: patientToken })
check('B10: paciente lee su propio feedback', r.status === 200 && (r.json?.length ?? 0) >= 1, `${r.json?.length} filas`)

r = await api(`/rest/v1/feedback?id=eq.${fb.id}`, { method: 'DELETE', token: patientToken })
check('B10: paciente borra su feedback en estado new', r.status === 204 || r.status === 200, `status ${r.status}`)

// --- Bloque 5: contact-form (público, sin auth) ---
// Nota: el envío real a CONTACT_INBOX puede fallar mientras el dominio no tenga
// MX (pendiente #10); la función sigue siendo válida si responde y valida.
r = await api('/functions/v1/contact-form', {
  method: 'POST',
  body: { nombre: 'Prueba E2E', email: 'e2e-core@test.somos-calma.com', tipo: 'paciente', mensaje: 'Mensaje de prueba E2E (ignorar)' },
})
const cfBody = JSON.stringify(r.json) ?? ''
const cfLive = r.status === 200 || (r.status === 500 && !/Nombre|Correo|Tipo|Mensaje|rate|intentos/i.test(cfBody))
check('B5: contact-form viva (valida y responde)', cfLive, `status ${r.status} ${cfBody.slice(0, 140)}`)

// --- Resultados ---
console.log('\n===== RESUMEN =====')
console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
