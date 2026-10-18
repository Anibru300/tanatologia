// Prueba E2E de jaas-webhook: firma eventos como lo haría JaaS y los POSTea.
// Uso: JAAS_TEST_SECRET=whsec_... node scripts/test-jaas-webhook.mjs [roomName]
import { createHmac } from 'node:crypto'

const SECRET = process.env.JAAS_TEST_SECRET
if (!SECRET) { console.error('Falta JAAS_TEST_SECRET'); process.exit(1) }
const URL = 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/jaas-webhook'
const APP_ID = 'vpaas-magic-cookie-test'

let passed = 0
let failed = 0
const check = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`✅ ${name}`) }
  else { failed++; console.log(`❌ ${name} ${extra}`) }
}

function sign(rawBody) {
  const t = Math.floor(Date.now() / 1000)
  const v1 = createHmac('sha256', SECRET).update(`${t}.${rawBody}`).digest('base64')
  return `t=${t},v1=${v1}`
}

async function send(event, useSignature = true, mutate = null) {
  let raw = JSON.stringify(event)
  if (mutate) raw = mutate(raw)
  const headers = { 'Content-Type': 'application/json' }
  if (useSignature) headers['X-Jaas-Signature'] = sign(raw)
  const res = await fetch(URL, { method: 'POST', headers, body: raw })
  let body = null
  try { body = await res.json() } catch { /* noop */ }
  return { status: res.status, body }
}

// ---------- 1. CORS / método ----------
{
  const res = await fetch(URL, { method: 'OPTIONS' })
  check('OPTIONS responde 200 (CORS)', res.status === 200)
  const resGet = await fetch(URL, { method: 'GET' })
  check('GET responde 405', resGet.status === 405)
}

// ---------- 2. Firma ----------
{
  const ev = { eventType: 'ROOM_CREATED', fqn: `${APP_ID}/sala-x`, timestamp: Date.now(), idempotencyKey: crypto.randomUUID(), data: {} }
  const noSig = await send(ev, false)
  check('Sin firma -> 401', noSig.status === 401)
  // Tampering real: firma el cuerpo original, envía uno alterado
  const original = JSON.stringify(ev)
  const t = Math.floor(Date.now() / 1000)
  const v1 = createHmac('sha256', SECRET).update(`${t}.${original}`).digest('base64')
  const tamperedRes = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Jaas-Signature': `t=${t},v1=${v1}` },
    body: original.replace('sala-x', 'sala-y'),
  })
  check('Cuerpo alterado -> 401 (firma no coincide)', tamperedRes.status === 401)
}

// ---------- 3. Evento sin cita (sala de prueba admin) ----------
{
  const ev = { eventType: 'ROOM_CREATED', fqn: `${APP_ID}/sala-sin-cita-${Date.now()}`, timestamp: Date.now(), idempotencyKey: crypto.randomUUID(), data: {} }
  const r = await send(ev)
  check('Sala sin cita -> ok ignorado', r.status === 200 && r.body?.ignored === 'no_appointment')
}

// ---------- 4. Cadena completa: cita de Héctor (ya completed) ----------
// Se pasa por argv: node test-jaas-webhook.mjs <roomName>
const roomName = process.argv[2]
if (roomName) {
  const base = Date.now()
  const evs = [
    { eventType: 'ROOM_CREATED', t: base, data: {} },
    { eventType: 'PARTICIPANT_JOINED', t: base + 1000, data: { participantJid: 'prof-1@8x8.vc', name: 'Profesional', moderator: 'true' } },
    { eventType: 'PARTICIPANT_JOINED', t: base + 5000, data: { participantJid: 'pac-1@8x8.vc', name: 'Paciente', moderator: 'false' } },
    { eventType: 'PARTICIPANT_LEFT', t: base + 3000000, data: { participantJid: 'pac-1@8x8.vc', name: 'Paciente' } },
    { eventType: 'ROOM_DESTROYED', t: base + 3100000, data: {} },
  ]
  let allOk = true
  const keys = []
  for (const e of evs) {
    const key = crypto.randomUUID()
    keys.push(key)
    const r = await send({ ...e, fqn: `${APP_ID}/${roomName}`, idempotencyKey: key })
    if (!(r.status === 200 && r.body?.ok)) { allOk = false; console.log('   evento falló:', e.eventType, r.status, JSON.stringify(r.body)) }
  }
  check('Cadena de 5 eventos firmados -> todos ok', allOk)

  // Reintento con el mismo idempotencyKey -> dedup (ok sin duplicar)
  const retry = await send({ ...evs[0], fqn: `${APP_ID}/${roomName}`, idempotencyKey: keys[0], timestamp: base })
  check('Reintento mismo idempotencyKey -> ok (dedup)', retry.status === 200 && retry.body?.ok === true)
}

console.log(`\n===== ${passed} pasaron, ${failed} fallaron =====`)
process.exit(failed > 0 ? 1 : 0)
