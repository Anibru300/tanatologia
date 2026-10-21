// Prueba E2E del fix A3 (migración 035): un profesional completo (cédula +
// 3 documentos subidos) debe poder enviar su expediente a revisión.
// Antes del fix, submit_for_review() fallaba con "Solo los administradores
// pueden cambiar el estado de verificación" (trigger 014 sin GUC).
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
const EMAIL = `e2e-review-${stamp}@test.somos-calma.com`
const PASSWORD = 'Review#2026Secure'

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

// 1. Registro profesional
const signup = await api('/auth/v1/signup', {
  method: 'POST',
  body: { email: EMAIL, password: PASSWORD, data: { role: 'professional', full_name: 'Profesional E2E Revisión' } },
})
check('Registro profesional', signup.status === 200, `status=${signup.status}`)

const login = await api('/auth/v1/token?grant_type=password', {
  method: 'POST', body: { email: EMAIL, password: PASSWORD },
})
const token = login.data?.access_token
const uid = login.data?.user?.id
check('Login', Boolean(token))

// 2. Capturar número de cédula (update propio permitido por RLS)
const pp = await api(`/rest/v1/professional_profiles?select=id&profile_id=eq.${uid}`, { token })
const ppId = pp.data?.[0]?.id
check('Subperfil profesional existe', Boolean(ppId))
const upd = await api(`/rest/v1/professional_profiles?id=eq.${ppId}`, {
  method: 'PATCH', token, body: { license_number: '12345678' },
})
check('Captura de cédula propia permitida', upd.status === 200 || upd.status === 204, `status=${upd.status}`)

// 3. Subir los 3 documentos obligatorios (rows en professional_documents)
let docsOk = true
for (const type of ['cedula', 'titulo', 'ine']) {
  const r = await api('/rest/v1/professional_documents', {
    method: 'POST', token,
    body: { professional_profile_id: ppId, document_type: type, storage_path: `e2e-test/${type}.pdf`, file_name: `${type}.pdf` },
  })
  if (r.status !== 201) { docsOk = false; console.error(`doc ${type}:`, r.status, JSON.stringify(r.data)) }
}
check('3 documentos subidos (cédula, título, INE)', docsOk)

// 4. submit_for_review — EL CASO DEL FIX A3
const review = await api('/rest/v1/rpc/submit_for_review', { method: 'POST', token, body: {} })
check('submit_for_review devuelve in_review (A3 arreglado)', review.data === 'in_review', `resp=${JSON.stringify(review.data)}`)

// 5. El estado realmente cambió en la tabla
const after = await api(`/rest/v1/professional_profiles?select=verification_status&id=eq.${ppId}`, { token })
check('verification_status = in_review persistido', after.data?.[0]?.verification_status === 'in_review', `status=${after.data?.[0]?.verification_status}`)

console.log(results.join('\n'))
console.log(`\n${passed} pasaron, ${failed} fallaron\n`)
console.log(`Usuario de prueba (se elimina automáticamente): ${EMAIL} / uid=${uid}`)
process.exit(failed > 0 ? 1 : 0)
