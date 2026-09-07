// Pruebas E2E del Chat paciente↔profesional (migración 023):
//   - start_conversation exige cita previa (can_chat)
//   - Intercambio de mensajes vía RPC + notificación in-app al otro
//   - Adjuntos: subida imagen (PNG) al bucket privado + mensaje con adjunto + signed URL
//   - Rechazo de MIME no permitido (.exe) y de INSERT directo en messages (RLS)
//   - Aislamiento: tercer usuario no lee la conversación ajena
//   - mark_conversation_read marca leídos
//   - Moderación silenciosa: admin lee todo, moderate_message marca + audita;
//     participantes ven deleted_by_moderation sin identidad del admin
//
// Uso:  ADMIN_EMAIL=admin@demo.com ADMIN_PASSWORD=<pass> node scripts/test-chat.mjs
// Requiere: .env con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY y CLI supabase vinculada.
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD (cuenta admin real) para probar la moderación.')
  process.exit(1)
}

const ts = Date.now().toString(36)
const EMAIL_PAT = `e2e-chat-${ts}-pat@test.somos-calma.com`
const EMAIL_PRO = `e2e-chat-${ts}-pro@test.somos-calma.com`
const EMAIL_STR = `e2e-chat-${ts}-str@test.somos-calma.com`
const PASSWORD = 'Test1234!x'

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

async function api(path, { method = 'GET', token, body, extraHeaders, raw } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      Prefer: method === 'GET' ? '' : 'return=representation',
      ...(extraHeaders || {}),
    },
    body: raw ? raw : body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* sin cuerpo */
  }
  return { status: res.status, json }
}

async function signup(email, role, fullName) {
  const r = await api('/auth/v1/signup', {
    method: 'POST',
    body: { email, password: PASSWORD, data: { full_name: fullName, role } },
  })
  if (!r.json?.user?.id) throw new Error(`Signup falló para ${email}: ${JSON.stringify(r.json)}`)
  return r.json.user.id
}

async function login(email, password = PASSWORD) {
  const r = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })
  if (!r.json?.access_token) throw new Error(`Login falló para ${email}`)
  return r.json.access_token
}

function dbQuery(sql) {
  const tmp = join(root, '.tmp-chat-query.sql')
  writeFileSync(tmp, sql)
  try {
    return execSync(`cd "${join(root, '..', 'supabase')}" && supabase db query --linked -f "${tmp}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } finally {
    rmSync(tmp)
  }
}

async function rpc(token, fn, args) {
  return api(`/rest/v1/rpc/${fn}`, { method: 'POST', token, body: args })
}

// ---------- setup ----------
console.log('Creando usuarios de prueba...')
const patUser = await signup(EMAIL_PAT, 'patient', 'Chat Paciente')
const proUser = await signup(EMAIL_PRO, 'professional', 'Chat Profesional')
const strUser = await signup(EMAIL_STR, 'patient', 'Chat Extraño')

console.log('Verificando profesional de prueba...')
dbQuery(`ALTER TABLE public.professional_profiles DISABLE TRIGGER USER;
UPDATE public.professional_profiles SET verification_status='verified', is_visible=true
WHERE profile_id='${proUser}';
ALTER TABLE public.professional_profiles ENABLE TRIGGER USER;`)

const patToken = await login(EMAIL_PAT)
const proToken = await login(EMAIL_PRO)
const strToken = await login(EMAIL_STR)

const patId = (await api(`/rest/v1/patient_profiles?select=id&profile_id=eq.${patUser}`, { token: patToken })).json?.[0]?.id
const proId = (await api(`/rest/v1/professional_profiles?select=id&profile_id=eq.${proUser}`, { token: proToken })).json?.[0]?.id
if (!patId || !proId) throw new Error('No se encontraron subperfiles de prueba')

// ---------- 1. can_chat: sin cita NO se puede abrir conversación ----------
let r = await rpc(patToken, 'start_conversation', { p_counterparty_profile_id: proUser })
check('Sin cita: start_conversation rechazado', r.status !== 200, `status ${r.status}`)

// ---------- 2. Crear slot + cita (flujo real de booking) ----------
const slotStart = new Date(Date.now() + 2 * 3600_000)
const slotEnd = new Date(slotStart.getTime() + 90 * 60_000)
r = await api('/rest/v1/availability_slots?select=id', {
  method: 'POST',
  token: proToken,
  body: { professional_profile_id: proId, slot_start: slotStart.toISOString(), slot_end: slotEnd.toISOString() },
})
check('Slot publicado por el profesional', r.status === 201, `status ${r.status}`)

r = await api('/rest/v1/appointments?select=id', {
  method: 'POST',
  token: patToken,
  body: {
    patient_profile_id: patId,
    professional_profile_id: proId,
    scheduled_at: slotStart.toISOString(),
    duration_minutes: 50,
    session_type: 'single',
    status: 'confirmed',
  },
})
const apptId = r.json?.[0]?.id
check('Cita confirmada entre paciente y profesional', r.status === 201 && !!apptId, `status ${r.status}`)

// ---------- 3. start_conversation con cita ----------
r = await rpc(patToken, 'start_conversation', { p_counterparty_profile_id: proUser })
const convId = r.json
check('Con cita: start_conversation devuelve UUID', r.status === 200 && /^[0-9a-f-]{36}$/.test(String(convId)), `status ${r.status}`)

// El profesional también puede iniciar (devuelve la MISMA conversación por UNIQUE)
r = await rpc(proToken, 'start_conversation', { p_counterparty_profile_id: patUser })
check('Profesional inicia y obtiene la misma conversación (idempotente)', r.status === 200 && r.json === convId, `status ${r.status}`)

// ---------- 4. Lista de conversaciones (ambos ven la suya, con el otro) ----------
r = await api(`/rest/v1/conversations?select=id,patient_profile_id,professional_profile_id`, { token: proToken })
check('Profesional ve su conversación en el listado', r.status === 200 && r.json?.some((c) => c.id === convId), `status ${r.status}`)

// ---------- 5. Envío y recepción de mensajes ----------
r = await rpc(patToken, 'send_message', { p_conversation_id: convId, p_content: 'Hola doctor, ¿cómo está?' })
const msg1 = r.json
check('Paciente envía mensaje de texto', r.status === 200 && /^[0-9a-f-]{36}$/.test(String(msg1)), `status ${r.status}`)

r = await rpc(proToken, 'send_message', { p_conversation_id: convId, p_content: 'Hola, muy bien. ¿En qué te ayudo?' })
check('Profesional responde', r.status === 200, `status ${r.status}`)

r = await api(`/rest/v1/messages?select=id,content,sender_profile_id&conversation_id=eq.${convId}&order=created_at.asc`, { token: proToken })
check('Profesional lee ambos mensajes (RLS participante)', r.status === 200 && r.json?.length === 2, `status ${r.status} n=${r.json?.length}`)

const notif = (await api(`/rest/v1/notifications?select=type,title,link&profile_id=eq.${proUser}&type=eq.chat_message&order=created_at.desc&limit=1`, { token: proToken })).json
check('Notificación in-app chat_message al profesional con link', notif?.length === 1 && notif[0].link === '/profesional/mensajes', JSON.stringify(notif))

// ---------- 6. Adjuntos: PNG aceptado, .exe rechazado ----------
// PNG 1x1
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const pngBytes = Buffer.from(pngBase64, 'base64')
const attPath = `${convId}/${crypto.randomUUID()}-nota.png`

r = await api(`/storage/v1/object/chat-attachments/${attPath}`, {
  method: 'POST',
  token: patToken,
  raw: pngBytes,
  extraHeaders: { 'Content-Type': 'image/png', 'x-upsert': 'false' },
})
check('Adjunto: paciente sube PNG al bucket privado', r.status === 200, `status ${r.status} ${JSON.stringify(r.json)}`)

r = await rpc(patToken, 'send_message', {
  p_conversation_id: convId,
  p_content: '',
  p_attachment_path: attPath,
  p_attachment_name: 'nota.png',
  p_attachment_size: pngBytes.length,
  p_attachment_mime: 'image/png',
})
check('Adjunto: mensaje solo-archivo enviado', r.status === 200, `status ${r.status}`)

r = await api(`/rest/v1/messages?select=id,attachment_path&conversation_id=eq.${convId}&attachment_path=not.is.null`, { token: proToken })
const signed = r.json?.[0]?.attachment_path
check('Adjunto: referencia visible para el profesional', !!signed, JSON.stringify(r.json))

r = await api(`/storage/v1/object/sign/chat-attachments/${signed}`, { method: 'POST', token: proToken, body: { expiresIn: 3600 } })
const signedUrl = r.json?.signedURL ? `${SUPABASE_URL}/storage/v1${r.json.signedURL}` : null
check('Adjunto: signed URL generada para participante', !!signedUrl, `status ${r.status} ${JSON.stringify(r.json)}`)

if (signedUrl) {
  const res = await fetch(signedUrl)
  const buf = Buffer.from(await res.arrayBuffer())
  check('Adjunto: contenido descargado coincide (PNG)', res.status === 200 && buf.equals(pngBytes), `status ${res.status}`)
}

// .exe rechazado por allowed_mime_types
const exePath = `${convId}/${crypto.randomUUID()}-virus.exe`
r = await api(`/storage/v1/object/chat-attachments/${exePath}`, {
  method: 'POST',
  token: patToken,
  raw: Buffer.from('MZ fake'),
  extraHeaders: { 'Content-Type': 'application/x-msdownload', 'x-upsert': 'false' },
})
check('Adjunto: .exe rechazado por política de MIME', r.status === 400 || r.status === 422, `status ${r.status}`)

// Adjunto en conversación ajena (path con otro UUID) rechazado por la política del bucket
r = await api(`/storage/v1/object/chat-attachments/${crypto.randomUUID()}/fake.png`, {
  method: 'POST',
  token: patToken,
  raw: pngBytes,
  extraHeaders: { 'Content-Type': 'image/png', 'x-upsert': 'false' },
})
check('Adjunto: subida fuera de conversación propia rechazada (RLS)', r.status === 400 || r.status === 403 || r.status === 401, `status ${r.status}`)

// ---------- 7. RLS negativos ----------
r = await api(`/rest/v1/messages`, {
  method: 'POST',
  token: patToken,
  body: { conversation_id: convId, sender_profile_id: patUser, content: 'inyección directa' },
})
check('RLS: INSERT directo en messages rechazado', r.status === 401 || r.status === 403 || r.status === 400, `status ${r.status}`)

r = await api(`/rest/v1/messages?select=id&conversation_id=eq.${convId}`, { token: strToken })
check('RLS: tercer usuario no lee la conversación ajena', r.status === 200 && r.json?.length === 0, `status ${r.status} n=${r.json?.length}`)

r = await api(`/rest/v1/conversations?select=id`, { token: strToken })
check('RLS: tercer usuario no ve conversaciones ajenas', r.status === 200 && r.json?.length === 0, `status ${r.status}`)

r = await rpc(strToken, 'send_message', { p_conversation_id: convId, p_content: 'soy intruso' })
check('RPC: no participante no puede enviar mensaje', r.status !== 200, `status ${r.status}`)

// ---------- 8. Marcar leído ----------
await rpc(proToken, 'mark_conversation_read', { p_conversation_id: convId })
r = await api(`/rest/v1/messages?select=read_at&conversation_id=eq.${convId}&sender_profile_id=neq.${proUser}`, { token: proToken })
check('Lectura: mensajes del paciente marcados leídos', r.status === 200 && r.json?.every((m) => m.read_at !== null), JSON.stringify(r.json))

// ---------- 9. Moderación silenciosa (admin) ----------
const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD)

r = await api(`/rest/v1/messages?select=id,content,deleted_by_moderation&conversation_id=eq.${convId}&order=created_at.asc`, { token: adminToken })
const adminSees = r.status === 200 && (r.json?.length ?? 0) >= 3
check('Moderación: admin lee todo el hilo (RLS admin)', adminSees, `status ${r.status} n=${r.json?.length}`)

const target = r.json?.find((m) => m.content === 'Hola doctor, ¿cómo está?')
r = await rpc(adminToken, 'moderate_message', { p_message_id: target?.id })
check('Moderación: admin marca mensaje eliminado', r.status === 200 || r.status === 204, `status ${r.status}`)

r = await api(`/rest/v1/messages?select=deleted_by_moderation&id=eq.${target?.id}`, { token: patToken })
check('Moderación: participante ve deleted_by_moderation (sin identidad del admin)', r.json?.[0]?.deleted_by_moderation === true, JSON.stringify(r.json))

const audit = dbQuery(`SELECT count(*) AS n FROM public.audit_logs WHERE action='moderate_message' AND record_id='${target?.id}';`)
check('Moderación: acción auditada en audit_logs', /│ 1\s+│/.test(audit), audit.split('\n').filter((l) => l.includes('│ 1')).join(' '))

// Paciente NO puede moderar
r = await rpc(patToken, 'moderate_message', { p_message_id: target?.id })
check('Moderación: paciente no puede moderar', r.status !== 200, `status ${r.status}`)

// ---------- cleanup ----------
console.log('Limpiando usuarios de prueba...')
// El adjunto queda huérfano en storage (el usuario se borra); el admin lo elimina
await api(`/storage/v1/object/chat-attachments/${attPath}`, { method: 'DELETE', token: adminToken })
const cleanupOut = dbQuery(`DELETE FROM auth.users WHERE email LIKE 'e2e-chat-${ts}-%@test.somos-calma.com';
SELECT count(*) AS restantes FROM auth.users WHERE email LIKE 'e2e-chat-${ts}-%@test.somos-calma.com';`)
check('Cleanup: 0 usuarios de prueba restantes', /│ 0\s+│/.test(cleanupOut), cleanupOut.split('\n').filter((l) => l.includes('restantes') || l.includes('│ 0')).join(' '))

console.log(`\n${passed} pasaron, ${failed} fallaron`)
process.exit(failed > 0 ? 1 : 0)
