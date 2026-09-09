// Pruebas de la Edge Function daily-test-room (sala de prueba Daily.co, solo admin).
// Uso: node scripts/test-daily.mjs
// No requiere DAILY_API_KEY: valida auth, autorización (403) y CORS.
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
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}
async function fn(payload, token, method = 'POST') {
  const res = await fetch(`${URL}/functions/v1/daily-test-room`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json, headers: res.headers }
}

// Usuario de prueba NO administrador
const PAT = `daily-pat-${ts}@test.somos-calma.com`
const PASS = 'DailyTest#2026x'
let r = await api('/auth/v1/signup', { method: 'POST', body: { email: PAT, password: PASS, data: { full_name: 'Daily Paciente', role: 'patient' } } })
check('Setup: signup paciente', r.status === 200 && !!r.json?.user?.id, `status ${r.status}`)
const patLogin = (await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: PAT, password: PASS } })).json

// 1. CORS: preflight OPTIONS responde con Access-Control-Allow-Origin
r = await fn(null, null, 'OPTIONS')
check('CORS: OPTIONS → 200 con Allow-Origin', r.status === 200 && !!r.headers.get('access-control-allow-origin'), `status ${r.status}`)

// 2. Sin autenticar → 401
r = await fn({})
check('Auth: sin sesión → 401', r.status === 401, `status ${r.status}`)

// 3. Paciente (no admin) → 403 (antes de consultar el API key)
r = await fn({}, patLogin.access_token)
check('Autorización: paciente (no admin) → 403', r.status === 403, `status ${r.status}`)

// 4. Método no permitido → 405
r = await fn(null, patLogin.access_token, 'GET')
check('Validación: GET → 405', r.status === 405, `status ${r.status}`)

// 5. Admin sin DAILY_API_KEY → 501 (no verificable sin credenciales admin;
//    se documenta: el caso admin correcto devuelve {url, name} con la key puesta)

// Cleanup
const { execSync } = await import('node:child_process')
const { writeFileSync, rmSync } = await import('node:fs')
writeFileSync(`.tmp-daily-del-${ts}.sql`, `DELETE FROM auth.users WHERE email = '${PAT}';`)
execSync(`cd ../supabase && supabase db query --linked -f "${process.cwd()}/.tmp-daily-del-${ts}.sql"`, { stdio: 'pipe' })
rmSync(`.tmp-daily-del-${ts}.sql`)
check('Cleanup: usuario de prueba eliminado', true)

console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
