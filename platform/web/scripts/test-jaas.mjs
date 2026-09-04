// Pruebas E2E de la Edge Function jaas-token (JWT de JaaS para salas de citas).
// Uso: node scripts/test-jaas.mjs
// Funciona SIN secrets de JaaS configurados: valida auth, autorización y fallback 501.
// Con secrets JAAS_* configurados además valida la firma y los claims del JWT.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const ts = Date.now().toString(36)
let passed = 0, failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}
async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json', Prefer: method === 'GET' ? '' : 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}
async function fn(payload, token) {
  const res = await fetch(`${URL}/functions/v1/jaas-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}
const b64url = (s) => Buffer.from(s, 'base64').toString('utf8')
const b64urlBytes = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

// Clave pública de JaaS (par de la privada en secrets). Es pública: sirve para
// verificar en el test que la Edge Function firma correctamente (RS256).
const JAAS_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgFTFj/JddKj6Dv8c8u3N
jquVIK3SNRziSMhlEXZ7/uxn7G6LRs9iYk+yJmpIwGKYzmMyns/NCoD5moVB38Ut
QWEzR/KDKhVm8L6KwyA3qLXXft2t4JT7AWqcnjxvHpEQmYIQxI1td/O723Q6evPN
pDEo4FYTmApFeaqMo917RM8fw2cXFKXk0Zp2VWcRyPtAkGFVYt9U9/h70TNVsVqY
hwLW2a2I+ZWBatYqs+ytXz9og6M56/ODAJUMA3cpSmXyX/EqtaLbiBgzi34KV7Xu
ZlgEiLradkCgjjRAJ0UxAW/PRtNRp5k+appIrJ/cFRx1zkEUU+897Z83CgH62NZf
zQIDAQAB
-----END PUBLIC KEY-----`

// Usuarios de prueba: un paciente y un profesional con cita entre ellos
const PAT = `jaas-pat-${ts}@test.somos-calma.com`
const PRO = `jaas-pro-${ts}@test.somos-calma.com`
const PASS = 'JaasTest#2026x'

let r = await api('/auth/v1/signup', { method: 'POST', body: { email: PAT, password: PASS, data: { full_name: 'JaaS Paciente', role: 'patient' } } })
check('Setup: signup paciente', r.status === 200 && !!r.json?.user?.id, `status ${r.status}`)
const patLogin = (await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: PAT, password: PASS } })).json
r = await api('/auth/v1/signup', { method: 'POST', body: { email: PRO, password: PASS, data: { full_name: 'JaaS Profesional', role: 'professional' } } })
const proId = r.json?.user?.id
check('Setup: signup profesional', r.status === 200 && !!proId, `status ${r.status}`)
const proLogin = (await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: PRO, password: PASS } })).json

// Marcar al profesional de prueba como verified (los slots solo son visibles
// para pacientes si el profesional está verificado). Requiere desactivar el
// trigger de restricción de updates, igual que test-security-negative.
const { execSync } = await import('node:child_process')
const { writeFileSync, rmSync } = await import('node:fs')
writeFileSync(`.tmp-jaas-verify-${ts}.sql`, `alter table public.professional_profiles disable trigger enforce_professional_profile_update_restrictions;
update public.professional_profiles set verification_status='verified', is_visible=true
  where profile_id in (select id from auth.users where email='${PRO}');
alter table public.professional_profiles enable trigger enforce_professional_profile_update_restrictions;`)
execSync(`cd ../supabase && supabase db query --linked -f "${process.cwd()}/.tmp-jaas-verify-${ts}.sql"`, { stdio: 'pipe' })
rmSync(`.tmp-jaas-verify-${ts}.sql`)

// 1. Sin autenticar → 401
r = await fn({ appointmentId: 'x' })
check('Auth: sin sesión → 401', r.status === 401, `status ${r.status}`)

// 2. Sin appointmentId → 400
r = await fn({}, patLogin.access_token)
check('Validación: sin appointmentId → 400', r.status === 400, `status ${r.status}`)

// 3. Cita ajena → 404 (RLS: no ve citas de otros)
r = await fn({ appointmentId: '00000000-0000-0000-0000-000000000000' }, patLogin.access_token)
check('RLS: cita ajena/inexistente → 404', r.status === 404, `status ${r.status}`)

// 4. Crear cita real: slot de disponibilidad (profesional) + cita (paciente)
const patId = (await api('/auth/v1/user', { token: patLogin.access_token })).json?.id
const proProfileId = (await api(`/rest/v1/professional_profiles?select=id&profile_id=eq.${proId}`, { token: proLogin.access_token })).json?.[0]?.id
const patProfileId = (await api(`/rest/v1/patient_profiles?select=id&profile_id=eq.${patId}`, { token: patLogin.access_token })).json?.[0]?.id
check('Setup: subperfiles encontrados', !!proProfileId && !!patProfileId, `pro=${!!proProfileId} pat=${!!patProfileId}`)
const sched = new Date(Date.now() + 7 * 86400_000)
sched.setHours(10, 0, 0, 0)
const slotEnd = new Date(sched.getTime() + 50 * 60_000)
r = await api('/rest/v1/availability_slots', {
  method: 'POST', token: proLogin.access_token,
  body: { professional_profile_id: proProfileId, slot_start: sched.toISOString(), slot_end: slotEnd.toISOString() },
})
const slotId = r.json?.[0]?.id
check('Setup: slot de disponibilidad creado', r.status === 201 && !!slotId, `status ${r.status} ${JSON.stringify(r.json)?.slice(0, 120)}`)
r = await api('/rest/v1/appointments', {
  method: 'POST', token: patLogin.access_token,
  body: {
    patient_profile_id: patProfileId,
    professional_profile_id: proProfileId,
    scheduled_at: sched.toISOString(),
    duration_minutes: 50,
    session_type: 'single',
    status: 'confirmed',
    notes: 'e2e jaas',
  },
})
const apptId = r.json?.[0]?.id
const apptVideoLink = r.json?.[0]?.video_link
check('Setup: cita agendada (con video_link por trigger)', r.status === 201 && !!apptId && !!apptVideoLink, `status ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`)

// 5. Paciente de la cita → 200 (o 501 si JaaS no configurado)
r = await fn({ appointmentId: apptId }, patLogin.access_token)
const jaasConfigured = r.status === 200
check('Paciente de la cita: token emitido o fallback 501', r.status === 200 || r.status === 501, `status ${r.status}`)

if (jaasConfigured) {
  const [h, p] = r.json.jwt.split('.')
  const header = JSON.parse(b64url(h))
  const claims = JSON.parse(b64url(p))
  check('JWT: firma RS256 con kid', header.alg === 'RS256' && !!header.kid, JSON.stringify(header))
  check('JWT: sala = video_link de la cita', claims.room === apptVideoLink, `room=${claims.room}`)
  check('JWT: paciente NO es moderador', claims.context?.user?.moderator === false)
  check('JWT: features desactivadas (recording/streaming off)', claims.context?.features?.recording === false && claims.context?.features?.livestreaming === false)
  check('JWT: expira en ~3h', claims.exp - Math.floor(Date.now() / 1000) > 2.5 * 3600, `exp=${claims.exp}`)
  // Verificación criptográfica real: la firma debe validar con la clave pública.
  const [jh, jp, js] = r.json.jwt.split('.')
  const { createVerify, createPublicKey } = await import('node:crypto')
  const ok = createVerify('RSA-SHA256')
    .update(`${jh}.${jp}`)
    .verify(createPublicKey(JAAS_PUBLIC_KEY_PEM), b64urlBytes(js))
  check('JWT: firma RS256 válida (verificada con clave pública)', ok)

  // 6. Profesional de la cita → moderador
  r = await fn({ appointmentId: apptId }, proLogin.access_token)
  const claimsPro = JSON.parse(b64url(r.json?.jwt?.split('.')[1] ?? 'e30'))
  check('Profesional: es moderador', r.status === 200 && claimsPro.context?.user?.moderator === true, `status ${r.status}`)

  // 7. Mismo JWT sala que el paciente (misma room)
  check('Mismo JWT de sala para ambos participantes', claimsPro.room === claims.room, `${claimsPro.room} vs ${claims.room}`)
} else {
  console.log('   (JaaS sin configurar: se validó el fallback 501; el frontend usará meet.jit.si)')
}

// Cleanup (statement por statement: el CLI puede no ejecutar varios en un solo -f)
const cleanupStmts = [
  `DELETE FROM public.appointments WHERE id = '${apptId ?? '00000000-0000-0000-0000-000000000000'}';`,
  `DELETE FROM public.availability_slots WHERE professional_profile_id = '${proProfileId ?? '00000000-0000-0000-0000-000000000000'}';`,
  `DELETE FROM auth.users WHERE email IN ('${PAT}','${PRO}');`,
  `SELECT count(*) AS restantes FROM auth.users WHERE email LIKE 'jaas-%@test.somos-calma.com';`,
]
let delOut = ''
for (const stmt of cleanupStmts) {
  writeFileSync(`.tmp-jaas-del-${ts}.sql`, stmt)
  delOut = execSync(`cd ../supabase && supabase db query --linked -f "${process.cwd()}/.tmp-jaas-del-${ts}.sql"`, { stdio: 'pipe' }).toString()
  rmSync(`.tmp-jaas-del-${ts}.sql`)
}
const nums = delOut.split('\n').filter((l) => l.includes('│')).flatMap((l) => l.split('│').map((c) => c.trim())).filter((c) => /^\d+$/.test(c))
check('Cleanup: usuarios de prueba eliminados', nums.length === 1 && nums[0] === '0', `restantes=${nums.join(',')}`)

console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
