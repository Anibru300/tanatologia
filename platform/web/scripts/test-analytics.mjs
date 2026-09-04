// Pruebas E2E de analítica first-party (migración 016) + fix de escalación de rol (017).
// Uso: ADMIN_PASSWORD=<pass> node scripts/test-analytics.mjs
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
const SESSION = `anatest-${ts}`
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
async function track(payload) {
  const res = await fetch(`${URL}/functions/v1/track-view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

// 1. Escalación de rol en signup (017) + timezone persistido (018)
const evil = await api('/auth/v1/signup', { method: 'POST', body: { email: `anatest-${ts}-evil@test.somos-calma.com`, password: 'Test1234!x', data: { full_name: 'Evil', role: 'admin', timezone: 'America/Monterrey' } } })
const evilUser = evil.json?.user?.id
const evilLogin = (await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: `anatest-${ts}-evil@test.somos-calma.com`, password: 'Test1234!x' } })).json
const evilProfile = (await api(`/rest/v1/profiles?select=role,timezone&id=eq.${evilUser}`, { token: evilLogin.access_token })).json?.[0]
check('Seguridad: signup con role=admin se degrada a patient (017)', evilProfile?.role === 'patient', `role=${evilProfile?.role}`)
check('Signup: timezone persistido en profiles (018)', evilProfile?.timezone === 'America/Monterrey', `timezone=${evilProfile?.timezone}`)

// 2. Tracking: beacon anónimo válido (con timezone)
let r = await track({ path: '/index.html', referrer: 'https://www.instagram.com/p/xyz', sessionKey: SESSION, source: 'site', timezone: 'America/Mexico_City' })
check('Track: beacon anónimo aceptado', r.status === 200 && r.json?.ok === true, `status ${r.status}`)

// 3. Timezone maliciosa: el WAF del gateway la bloquea (403) o la función la ignora (200)
r = await track({ path: '/tz', sessionKey: SESSION, source: 'site', timezone: "bad'; DROP TABLE--" })
check('Track: timezone maliciosa bloqueada/ignorada', r.status === 200 || r.status === 403, `status ${r.status}`)

// 4. Path inválido rechazado
r = await track({ path: 'javascript:alert(1)', sessionKey: SESSION, source: 'site' })
check('Track: path inválido rechazado (400)', r.status === 400, `status ${r.status}`)

// 5. sessionKey inválida rechazada
r = await track({ path: '/ok', sessionKey: 'x', source: 'site' })
check('Track: sessionKey corta rechazada (400)', r.status === 400, `status ${r.status}`)

// 6. Insert directo a la tabla bloqueado (anon y authenticated)
r = await api('/rest/v1/page_views', { method: 'POST', body: { path: '/hack', session_key: SESSION, source: 'site' } })
check('RLS: insert directo anónimo bloqueado', r.status === 401 || r.status === 403 || r.status === 400, `status ${r.status}`)
r = await api('/rest/v1/page_views', { method: 'POST', token: evilLogin.access_token, body: { path: '/hack', session_key: SESSION, source: 'site' } })
check('RLS: insert directo autenticado (no admin) bloqueado', r.status === 401 || r.status === 403 || r.status === 400, `status ${r.status}`)

// 7. Lectura: patient no ve nada; admin sí
r = await api('/rest/v1/page_views?select=id&limit=1', { token: evilLogin.access_token })
check('RLS: patient no puede leer page_views', r.status === 401 || r.status === 403 || (Array.isArray(r.json) && r.json.length === 0), `status ${r.status}`)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
if (ADMIN_PASSWORD) {
  const adminLogin = (await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: 'admin@demo.com', password: ADMIN_PASSWORD } })).json
  if (!adminLogin.access_token) {
    check('Admin login para verificación', false, 'credenciales admin inválidas')
  } else {
    r = await api(`/rest/v1/page_views?select=path,referrer,device,browser,timezone&session_key=eq.${SESSION}&path=eq.%2Findex.html`, { token: adminLogin.access_token })
    const row = r.json?.[0]
    check('Admin: lee la vista registrada', r.status === 200 && !!row, `status ${r.status}`)
    check('Admin: referrer sanitizado a origen', row?.referrer === 'https://www.instagram.com', `referrer=${row?.referrer}`)
    check('Admin: timezone guardado en la vista', row?.timezone === 'America/Mexico_City', `timezone=${row?.timezone}`)
    // 8. Cleanup de SOLO los rows de prueba
    r = await api(`/rest/v1/page_views?session_key=eq.${SESSION}`, { method: 'DELETE', token: adminLogin.access_token })
    check('Cleanup: admin borra solo las filas de prueba', r.status === 200 || r.status === 204, `status ${r.status}`)
  }
} else {
  check('Admin login para verificación', false, 'ADMIN_PASSWORD no provisto')
}

// 9. Cleanup del usuario de prueba del test de escalación
const { execSync } = await import('node:child_process')
const { writeFileSync, rmSync } = await import('node:fs')
writeFileSync(`.tmp-anatest-del-${ts}.sql`, `DELETE FROM auth.users WHERE email LIKE 'anatest-${ts}-%@test.somos-calma.com';`)
execSync(`cd ../supabase && supabase db query --linked -f "${process.cwd()}/.tmp-anatest-del-${ts}.sql"`, { stdio: 'pipe' })
rmSync(`.tmp-anatest-del-${ts}.sql`)

console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
