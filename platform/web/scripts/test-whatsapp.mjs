// Pruebas de la Edge Function whatsapp-notify (avisos de cita por WhatsApp).
// Uso:
//   node scripts/test-whatsapp.mjs                  → auth, CORS y 405
//   CRON_SECRET=<valor> node scripts/test-whatsapp.mjs  → además 401 vs 501/400
//
// Funciona SIN secrets de WhatsApp configurados (es el estado esperado durante
// la Beta hasta que el dueño termine el trámite en Meta): la función debe
// responder 501 sin romper a los llamadores (dispatch_whatsapp es best-effort).
// El CRON_SECRET se lee del entorno (nunca del repo): es el mismo que vive en
// el vault de Supabase y en los Edge Function secrets.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const URL = env.VITE_SUPABASE_URL
const CRON_SECRET = process.env.CRON_SECRET
let passed = 0, failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}
async function raw(path, { method = 'POST', secret, body } = {}) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-cron-secret': secret } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json, headers: res.headers }
}

// 1. Preflight CORS (incidente real previo: sin OPTIONS la llamada del
//    navegador caía en silencio).
{
  const res = await fetch(`${URL}/functions/v1/whatsapp-notify`, { method: 'OPTIONS' })
  check('OPTIONS preflight responde 200', res.status === 200)
  check('OPTIONS incluye CORS headers', Boolean(res.headers.get('access-control-allow-origin')))
}

// 2. Método no permitido
{
  const res = await fetch(`${URL}/functions/v1/whatsapp-notify`, { method: 'GET' })
  check('GET responde 405', res.status === 405)
}

// 3. Auth: sin header y con header incorrecto → 401
{
  const noHeader = await raw('/functions/v1/whatsapp-notify', { body: { type: 'appointment_booked', appointment_id: '00000000-0000-0000-0000-000000000000' } })
  check('POST sin x-cron-secret responde 401', noHeader.status === 401)
  const wrong = await raw('/functions/v1/whatsapp-notify', { secret: 'secreto-incorrecto', body: { type: 'appointment_booked', appointment_id: '00000000-0000-0000-0000-000000000000' } })
  check('POST con x-cron-secret incorrecto responde 401', wrong.status === 401)
}

// 4. Con el secreto correcto: sin configurar WhatsApp → 501 (degradación
//    elegante); configurado → valida type inválido (400).
if (CRON_SECRET) {
  const invalidType = await raw('/functions/v1/whatsapp-notify', {
    secret: CRON_SECRET,
    body: { type: 'tipo_inventado', appointment_id: '00000000-0000-0000-0000-000000000000' },
  })
  if (invalidType.status === 501) {
    check('Sin WHATSAPP_TOKEN/PHONE_NUMBER_ID responde 501', Boolean(invalidType.json?.error))
    console.log('   (estado esperado hasta que el dueño configure Meta; los triggers lo ignoran)')
  } else {
    check('type inválido responde 400', invalidType.status === 400, `status=${invalidType.status}`)
    const noAppt = await raw('/functions/v1/whatsapp-notify', { secret: CRON_SECRET, body: { type: 'appointment_booked' } })
    check('appointment_id faltante responde 400', noAppt.status === 400)
    const fakeAppt = await raw('/functions/v1/whatsapp-notify', {
      secret: CRON_SECRET,
      body: { type: 'appointment_booked', appointment_id: '00000000-0000-0000-0000-000000000000' },
    })
    // Cita inexistente → 404 (los errores de Graph API jamás deben tumbar la función).
    check('cita inexistente responde 404', fakeAppt.status === 404, `status=${fakeAppt.status}`)
  }
} else {
  console.log('⏭️  Sin CRON_SECRET en el entorno: se omiten las pruebas 501/400/404.')
  console.log('   Corre como: CRON_SECRET=<valor-del-vault> node scripts/test-whatsapp.mjs')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
