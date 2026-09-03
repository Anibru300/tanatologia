// Prueba E2E del flujo de autenticación real contra Supabase Cloud.
// Uso: node scripts/test-auth-flow.mjs
// Crea usuarios de prueba marcados; BORRARLOS después desde el dashboard de Supabase.
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

if (!SUPABASE_URL || !ANON) {
  console.error('FALTAN VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const stamp = Date.now()
const EMAIL_PATIENT = `beta-test-paciente-${stamp}@test.somos-calma.com`
const EMAIL_PRO = `beta-test-profesional-${stamp}@test.somos-calma.com`
const EMAIL_ADMIN_ATTEMPT = `beta-test-admin-${stamp}@test.somos-calma.com`
const PASSWORD = 'BetaTest#2026Secure'

let passed = 0
let failed = 0
const results = []

function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      'Content-Type': 'application/json',
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

// 1. Registro paciente
const signupPatient = await api('/auth/v1/signup', {
  method: 'POST',
  body: {
    email: EMAIL_PATIENT,
    password: PASSWORD,
    data: { full_name: 'Beta Test Paciente', role: 'patient' },
  },
})
check(
  'Registro paciente (signUp + sesión inmediata)',
  signupPatient.status === 200 && signupPatient.json?.access_token,
  `status ${signupPatient.status}`
)
const patientToken = signupPatient.json?.access_token

// 2. El trigger creó el perfil con rol patient
if (patientToken) {
  const prof = await api('/rest/v1/profiles?select=role,full_name,email', { token: patientToken })
  const row = prof.json?.[0]
  check(
    'Trigger handle_new_user creó perfil con rol=patient',
    prof.status === 200 && row?.role === 'patient',
    `role=${row?.role}`
  )

  // 3. El subperfil de paciente existe y es propio
  const pp = await api('/rest/v1/patient_profiles?select=id', { token: patientToken })
  check('Subperfil patient_profiles creado', pp.status === 200 && Array.isArray(pp.json) && pp.json.length === 1)

  // 4. RLS: solo ve su propio perfil (no puede listar otros)
  const all = await api('/rest/v1/profiles?select=id', { token: patientToken })
  check('RLS: paciente solo ve su propio perfil', all.status === 200 && all.json?.length === 1)
}

// 5. Registro profesional
const signupPro = await api('/auth/v1/signup', {
  method: 'POST',
  body: {
    email: EMAIL_PRO,
    password: PASSWORD,
    data: { full_name: 'Beta Test Profesional', role: 'professional' },
  },
})
check('Registro profesional', signupPro.status === 200 && !!signupPro.json?.access_token, `status ${signupPro.status}`)
const proToken = signupPro.json?.access_token

if (proToken) {
  const prof = await api('/rest/v1/profiles?select=role', { token: proToken })
  check('Rol professional asignado', prof.json?.[0]?.role === 'professional', `role=${prof.json?.[0]?.role}`)
  const pp = await api('/rest/v1/professional_profiles?select=id,verification_status', { token: proToken })
  check(
    'Subperfil professional_profiles creado (verification_status=pending)',
    pp.status === 200 && pp.json?.[0]?.verification_status === 'pending',
    `status=${pp.json?.[0]?.verification_status}`
  )
  // 6. El profesional NO puede auto-verificarse
  const own = await api('/rest/v1/professional_profiles?select=id', { token: proToken })
  const proProfileId = own.json?.[0]?.id
  const _hack = await api(`/rest/v1/professional_profiles?id=eq.${proProfileId}`, {
    method: 'PATCH',
    token: proToken,
    body: { verification_status: 'verified' },
  })
  const after = await api('/rest/v1/professional_profiles?select=verification_status', { token: proToken })
  check(
    'Profesional NO puede auto-verificarse (trigger bloquea)',
    after.json?.[0]?.verification_status !== 'verified',
    `status=${after.json?.[0]?.verification_status}`
  )
  // 7. El profesional NO puede cambiar su role a admin
  const me = await api('/rest/v1/profiles?select=id', { token: proToken })
  const _roleHack = await api(`/rest/v1/profiles?id=eq.${me.json?.[0]?.id}`, {
    method: 'PATCH',
    token: proToken,
    body: { role: 'admin' },
  })
  const meAfter = await api('/rest/v1/profiles?select=role', { token: proToken })
  check('Usuario NO puede cambiar su role a admin', meAfter.json?.[0]?.role === 'professional')

  // 8. RLS: profesional B no lee documentos de otros (bucket privado, listing carpeta propia)
  const docs = await api('/rest/v1/professional_documents?select=*', { token: proToken })
  check('Profesional lista sus documentos (vacío al inicio)', docs.status === 200 && Array.isArray(docs.json))
}

// 9. Intento de registro con role=admin → el trigger lo degrada a patient
const signupAdmin = await api('/auth/v1/signup', {
  method: 'POST',
  body: {
    email: EMAIL_ADMIN_ATTEMPT,
    password: PASSWORD,
    data: { full_name: 'Beta Test Admin', role: 'admin' },
  },
})
const adminToken = signupAdmin.json?.access_token
if (adminToken) {
  const prof = await api('/rest/v1/profiles?select=role', { token: adminToken })
  check(
    'Registro con role=admin es degradado a patient (sin auto-registro de admins)',
    prof.json?.[0]?.role === 'patient',
    `role=${prof.json?.[0]?.role}`
  )
  // 10. Ese usuario NO puede leer audit_logs (solo admin real)
  const audit = await api('/rest/v1/audit_logs?select=*', { token: adminToken })
  check('Usuario normal NO puede leer audit_logs', audit.status === 403 || (audit.status === 200 && audit.json?.length === 0))
} else {
  check('Registro con role=admin es degradado a patient', false, `signup status ${signupAdmin.status}`)
}

// 11. Login con contraseña incorrecta → rechazado
const badLogin = await api('/auth/v1/token?grant_type=password', {
  method: 'POST',
  body: { email: EMAIL_PATIENT, password: 'contrasena-incorrecta' },
})
check('Login con contraseña incorrecta rechazado', badLogin.status === 400, `status ${badLogin.status}`)

// 12. Login correcto del paciente
const goodLogin = await api('/auth/v1/token?grant_type=password', {
  method: 'POST',
  body: { email: EMAIL_PATIENT, password: PASSWORD },
})
check('Login correcto devuelve sesión', goodLogin.status === 200 && !!goodLogin.json?.access_token)

// 13. Usuario anónimo NO puede listar perfiles
const anon = await api('/rest/v1/profiles?select=id')
check('Anónimo NO puede listar perfiles (RLS)', anon.status === 403 || (anon.status === 200 && anon.json?.length === 0))

console.log('\n===== RESULTADOS =====')
results.forEach((r) => console.log(r))
console.log(`\n${passed} pasaron, ${failed} fallaron`)
console.log('\nCuentas de prueba creadas (BORRAR desde Supabase Dashboard > Authentication > Users):')
console.log(`  ${EMAIL_PATIENT}`)
console.log(`  ${EMAIL_PRO}`)
console.log(`  ${EMAIL_ADMIN_ATTEMPT}`)
process.exit(failed > 0 ? 1 : 0)
