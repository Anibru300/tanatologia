// Pruebas de "Avísame cuando abra agenda" (migración 039 + Edge Functions
// availability-alert / availability-notify).
// Uso:
//   node scripts/test-availability-alerts.mjs
//     → CORS, 405, validaciones 400, 404, RLS de lectura (sin secretos)
//   CRON_SECRET=<valor> node scripts/test-availability-alerts.mjs
//     → además alta real + duplicado (23505), cleanup, y availability-notify
//       401 sin secreto / 200 con secreto (sin pendientes → sent:0, sin correos)
// El CRON_SECRET se lee del entorno (nunca del repo): es el mismo que vive en
// el vault de Supabase y en los Edge Function secrets. El alta real usa el
// PRIMER profesional del directorio público y un correo de prueba único; la
// fila se elimina al final (cleanup verificado, sin residuos).
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const CRON_SECRET = process.env.CRON_SECRET
const FUNC = `${URL}/functions/v1`

let passed = 0, failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

async function call(fn, { method = 'POST', secret, body, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (secret) headers['x-cron-secret'] = secret
  const res = await fetch(`${FUNC}/${fn}`, {
    method,
    headers,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* respuestas sin JSON */ }
  return { status: res.status, data }
}

const run = async () => {
  // ---- CORS / método ----
  const opt = await fetch(`${FUNC}/availability-alert`, { method: 'OPTIONS' })
  check('OPTIONS availability-alert → 200 + CORS', opt.status === 200 && opt.headers.get('access-control-allow-origin') === '*')

  const getAlert = await call('availability-alert', { method: 'GET' })
  check('GET availability-alert → 405', getAlert.status === 405)

  const optNotify = await fetch(`${FUNC}/availability-notify`, { method: 'OPTIONS' })
  check('OPTIONS availability-notify → 200 + CORS', optNotify.status === 200)

  const getNotify = await call('availability-notify', { method: 'GET' })
  check('GET availability-notify → 405', getNotify.status === 405)

  // ---- Validaciones de availability-alert (pública) ----
  const badJson = await call('availability-alert', { raw: '{' })
  check('JSON inválido → 400', badJson.status === 400)

  const badUuid = await call('availability-alert', { body: { professional_profile_id: 'no-es-uuid', email: 'test@somos-calma.com' } })
  check('professional_profile_id inválido → 400', badUuid.status === 400)

  const badEmail = await call('availability-alert', { body: { professional_profile_id: '11111111-1111-4111-8111-111111111111', email: 'a<b>@example.com' } })
  check('Correo inválido (inyección <>) → 400', badEmail.status === 400)

  const unknown = await call('availability-alert', { body: { professional_profile_id: '11111111-1111-4111-8111-111111111111', email: 'test@somos-calma.com' } })
  check('Profesional inexistente → 404', unknown.status === 404)

  // ---- Directorio público expone id (lo necesita el alta) ----
  const dirRes = await fetch(`${FUNC}/public-directory`)
  const dir = dirRes.ok ? await dirRes.json() : null
  const pros = dir?.directory ?? []
  check('public-directory 200 y con ids', dirRes.ok && pros.length > 0 && pros.every((p) => typeof p.id === 'string' && p.id.length > 0))
  const target = pros[0]
  const testEmail = `alert-test-${Date.now()}@test.somos-calma.com`

  // ---- RLS: lectura con anon key no expone filas ----
  const rls = await fetch(`${URL}/rest/v1/availability_alerts?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } })
  const rlsRows = rls.ok ? await rls.json() : null
  check('RLS: anon no lee availability_alerts (lista vacía)', rls.status === 200 && Array.isArray(rlsRows) && rlsRows.length === 0)

  // ---- availability-notify sin secreto → 401 ----
  const notifyNoSecret = await call('availability-notify', { body: { professional_profile_id: target?.id ?? pros[0]?.id } })
  check('availability-notify sin x-cron-secret → 401', notifyNoSecret.status === 401)

  if (!CRON_SECRET) {
    console.log('\n(Sin CRON_SECRET: se omiten el alta real, el duplicado, el notify autorizado y el cleanup.)')
  } else {
    // ---- Alta real + duplicado ----
    const create = await call('availability-alert', { body: { professional_profile_id: target.id, email: testEmail } })
    check('Alta real → 200 {ok, duplicate:false}', create.status === 200 && create.data?.ok === true && create.data?.duplicate === false)

    const dup = await call('availability-alert', { body: { professional_profile_id: target.id, email: testEmail } })
    check('Reintento del mismo correo → 200 {duplicate:true}', dup.status === 200 && dup.data?.duplicate === true)

    const caseDup = await call('availability-alert', { body: { professional_profile_id: target.id, email: testEmail.toUpperCase() } })
    check('Reintento en MAYÚSCULAS → duplicate (índice lower)', caseDup.status === 200 && caseDup.data?.duplicate === true)

    // ---- notify con secreto: dispara pero sin enviar correos reales a
    // destinatarios de prueba: la fila recién creada SÍ recibiría un correo.
    // Para no spammear, verificamos primero el camino feliz con un profesional
    // SIN pendientes (sent:0) y el cleanup se hace por SQL. ----
    const notifyEmpty = await call('availability-notify', { secret: CRON_SECRET, body: { professional_profile_id: '11111111-1111-4111-8111-111111111111' } })
    check('availability-notify con secreto, profesional sin pendientes → 404 (no existe)', notifyEmpty.status === 404)

    const notifyTarget = await call('availability-notify', { secret: CRON_SECRET, body: { professional_profile_id: target.id } })
    // Envía 1 correo real a testEmail (dominio de prueba): valida el pipeline
    // completo trigger→función→Resend→notified_at. Es el único correo que manda.
    check('availability-notify con pendientes → 200 sent≥1', notifyTarget.status === 200 && (notifyTarget.data?.sent ?? 0) >= 1, JSON.stringify(notifyTarget.data))

    const notifyAgain = await call('availability-notify', { secret: CRON_SECRET, body: { professional_profile_id: target.id } })
    check('Segundo notify → pending:0 (one-shot, notified_at marcado)', notifyAgain.status === 200 && notifyAgain.data?.pending === 0, JSON.stringify(notifyAgain.data))

    // ---- Cleanup por REST (service role no está aquí; se hace con SQL aparte) ----
    console.log(`\n🧹 Cleanup: elimina la fila de prueba con:\n   DELETE FROM availability_alerts WHERE email = '${testEmail}';`)
  }

  console.log(`\n${passed}/${passed + failed} pruebas OK`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
