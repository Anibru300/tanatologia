// No-show: sala destruida con <2 participantes -> la cita pending pasa a no_show.
import { createHmac } from 'node:crypto'

const SECRET = process.env.JAAS_TEST_SECRET
const URL = 'https://qjwebikgrqtotqfipeqt.supabase.co/functions/v1/jaas-webhook'
const ROOM = 'test-noshow-room-001'

function sign(rawBody) {
  const t = Math.floor(Date.now() / 1000)
  const v1 = createHmac('sha256', SECRET).update(`${t}.${rawBody}`).digest('base64')
  return `t=${t},v1=${v1}`
}

async function send(eventType, data, t) {
  const raw = JSON.stringify({
    eventType, sessionId: 'test-session-noshow', timestamp: t,
    fqn: `vpaas-magic-cookie-test/${ROOM}`, idempotencyKey: crypto.randomUUID(), data,
  })
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Jaas-Signature': sign(raw) },
    body: raw,
  })
  return { status: res.status, body: await res.json() }
}

const now = Date.now()
console.log('ROOM_CREATED:', (await send('ROOM_CREATED', {}, now)).status)
console.log('JOIN profr solo:', (await send('PARTICIPANT_JOINED', { participantJid: 'solo-prof@8x8.vc', name: 'Profr', moderator: 'true' }, now + 1000)).status)
console.log('ROOM_DESTROYED:', (await send('ROOM_DESTROYED', {}, now + 3600000)).status)
