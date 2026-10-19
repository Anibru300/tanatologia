// Pruebas E2E de la Bandeja de entrada del admin (migración 033):
//   - inbound-email: verificación svix (sin firma / firma mala / firma válida),
//     eventos distintos a email.received se ignoran sin llamar al Receiving API
//   - RLS de email_inbox: paciente no lee nada; admin lee todo
//   - inbox-reply: paciente -> 403; admin -> 200, fila 'out' con threading
//     (in_reply_to/references del original), original marcado leído
//
// Uso:
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... RESEND_INBOUND_SECRET=whsec_... node scripts/test-inbox.mjs
//
// RESEND_INBOUND_SECRET debe ser el MISMO valor configurado en Supabase
// (supabase secrets set RESEND_INBOUND_SECRET=...). La firma válida con un
// email_id inexistente debe llegar al Receiving API y volver 502 (es el
// comportamiento esperado: valida autenticación y deja que Resend reintente).
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
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
const INBOUND_SECRET = process.env.RESEND_INBOUND_SECRET

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD (cuenta admin real).')
  process.exit(1)
}
if (!INBOUND_SECRET) {
  console.error('Define RESEND_INBOUND_SECRET (el mismo valor del secret de Supabase).')
  process.exit(1)
}

const ts = Date.now().toString(36)
const PASSWORD = 'Test1234!x'
const PATIENT_EMAIL = `e2e-inbox-${ts}-pat@test.somos-calma.com`

// Mensaje de prueba insertado por SQL (la recepción real pasa por Resend).
const IN_ID = '11111111-2222-4333-8444-555555550001'
const IN_MESSAGE_ID = `e2e-inbox-${ts}@test.somos-calma.com`

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) passed++
  else failed++
}

async function api(path, { method = 'GET', token, body, extraHeaders } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* cuerpo no JSON */
  }
  return { status: res.status, data }
}

async function login(email, password) {
  const { status, data } = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  })
  if (status !== 200 || !data?.access_token) throw new Error(`Login falló para ${email}`)
  return data.access_token
}

async function signup(email, role) {
  const { status, data } = await api('/auth/v1/signup', {
    method: 'POST',
    body: { email, password: PASSWORD, data: { full_name: 'E2E Inbox', role } },
  })
  if (status >= 400 || !data?.access_token) throw new Error(`Signup falló para ${email}`)
  return data.access_token
}

function dbQuery(sql) {
  const tmp = join(root, `.tmp-inbox-${Date.now()}.sql`)
  writeFileSync(tmp, sql)
  try {
    return execSync(`cd ${join(root, '..', 'supabase')} && supabase db query --linked -f "${tmp}"`, {
      stdio: 'pipe',
    }).toString()
  } finally {
    rmSync(tmp, { force: true })
  }
}

// Firma svix idéntica a la que envía Resend (y a la que verifica inbound-email).
function svixHeaders(payload) {
  const id = `msg_e2e_${ts}`
  const timestamp = Math.floor(Date.now() / 1000)
  const key = Buffer.from(INBOUND_SECRET.replace(/^whsec_/, ''), 'base64')
  const sig = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest('base64')
  return { 'svix-id': id, 'svix-timestamp': String(timestamp), 'svix-signature': `v1,${sig}` }
}

async function postInbound(body, headers = {}) {
  return api('/functions/v1/inbound-email', {
    method: 'POST',
    body,
    extraHeaders: { 'Content-Type': 'text/plain', ...headers },
  })
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('— Preparación: paciente de prueba y mensaje en la bandeja —')
  const patientToken = await signup(PATIENT_EMAIL, 'patient')
  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD)

  dbQuery(`INSERT INTO public.email_inbox (id, direction, from_email, from_name, to_email, subject, text_body, message_id, is_read)
VALUES ('${IN_ID}', 'in', '${PATIENT_EMAIL}', 'E2E Inbox', 'hola@somos-calma.com', 'Consulta de prueba E2E', 'Hola, este es un mensaje de prueba.', '${IN_MESSAGE_ID}', false)
ON CONFLICT (id) DO NOTHING;`)

  // -------------------------------------------------------------------------
  console.log('\n— inbound-email: verificación de firma svix —')
  const health = await api('/functions/v1/inbound-email', { method: 'GET' })
  check('GET de salud responde 200', health.status === 200)

  const noSig = await postInbound({ type: 'email.received', data: { email_id: 'x' } })
  check('Sin firma -> 401', noSig.status === 401)

  const badSig = await postInbound({ type: 'email.received', data: { email_id: 'x' } }, {
    'svix-id': 'msg_bad',
    'svix-timestamp': String(Math.floor(Date.now() / 1000)),
    'svix-signature': 'v1,aW52YWxpZA==',
  })
  check('Firma inválida -> 401', badSig.status === 401)

  const validSigUnknownId = await postInbound(
    { type: 'email.received', data: { email_id: '00000000-0000-0000-0000-000000000000' } },
    svixHeaders(JSON.stringify({ type: 'email.received', data: { email_id: '00000000-0000-0000-0000-000000000000' } }))
  )
  check(
    'Firma válida + email_id inexistente -> 502 (llegó al Receiving API, Resend reintentará)',
    validSigUnknownId.status === 502
  )

  const ignoredPayload = { type: 'email.sent', data: { email_id: 'x' } }
  const ignored = await postInbound(ignoredPayload, svixHeaders(JSON.stringify(ignoredPayload)))
  check('Evento distinto a email.received -> 200 ignorado', ignored.status === 200 && ignored.data?.ignored === 'email.sent')

  // -------------------------------------------------------------------------
  console.log('\n— RLS de email_inbox —')
  const patientRead = await api('/rest/v1/email_inbox?select=id&limit=5', { token: patientToken })
  check(
    'Paciente NO lee la bandeja (lista vacía por RLS)',
    patientRead.status === 200 && Array.isArray(patientRead.data) && patientRead.data.length === 0
  )

  const adminRead = await api(`/rest/v1/email_inbox?select=id&direction=eq.in&id=eq.${IN_ID}`, { token: adminToken })
  check('Admin SÍ lee la bandeja', adminRead.status === 200 && adminRead.data?.some?.((r) => r.id === IN_ID))

  const patientInsert = await api('/rest/v1/email_inbox', {
    method: 'POST',
    token: patientToken,
    body: { direction: 'in', from_email: PATIENT_EMAIL, to_email: 'hola@somos-calma.com' },
  })
  check('Paciente NO puede insertar (sin política INSERT)', patientInsert.status >= 400)

  // -------------------------------------------------------------------------
  console.log('\n— inbox-reply —')
  const patientReply = await api('/functions/v1/inbox-reply', {
    method: 'POST',
    token: patientToken,
    body: { inbox_id: IN_ID, text: 'Intento de respuesta como paciente.' },
  })
  check('Paciente responde -> 403', patientReply.status === 403)

  const adminReply = await api('/functions/v1/inbox-reply', {
    method: 'POST',
    token: adminToken,
    body: { inbox_id: IN_ID, text: 'Gracias por tu mensaje. Esta es una respuesta de prueba E2E.' },
  })
  check('Admin responde -> 200', adminReply.status === 200 && adminReply.data?.ok === true, adminReply.data?.warning ?? '')

  const outRow = await api(
    `/rest/v1/email_inbox?select=id,subject,in_reply_to,refs,direction&direction=eq.out&in_reply_to=eq.${IN_MESSAGE_ID}`,
    { token: adminToken }
  )
  const out = outRow.data?.[0]
  check(
    "Fila 'out' registrada con hilo correcto",
    outRow.status === 200 && Boolean(out) && out.subject === 'Re: Consulta de prueba E2E' &&
      Array.isArray(out.references) && out.references.includes(IN_MESSAGE_ID)
  )

  const origRow = await api(`/rest/v1/email_inbox?select=is_read&id=eq.${IN_ID}`, { token: adminToken })
  check('Mensaje original marcado como leído', origRow.data?.[0]?.is_read === true)

  // -------------------------------------------------------------------------
  console.log('\n— Limpieza —')
  dbQuery(`DELETE FROM public.email_inbox WHERE id = '${IN_ID}' OR in_reply_to = '${IN_MESSAGE_ID}';
DELETE FROM auth.users WHERE email = '${PATIENT_EMAIL}';`)
  check('Filas de prueba y usuario eliminados', true)

  console.log(`\n===== ${passed} pasaron, ${failed} fallaron =====`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Error inesperado:', err.message)
  process.exit(1)
})
