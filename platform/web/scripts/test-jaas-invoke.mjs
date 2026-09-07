// Diagnóstico: replica el camino exacto del navegador en producción.
// Crea paciente+profesional de prueba con cita real y llama la Edge Function
// jaas-token con supabase.functions.invoke (igual que fetchJaasToken en el
// frontend), para capturar por qué cae al fallback meet.jit.si.
// Uso: node scripts/diag-jaas.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const ts = Date.now().toString(36)
const PAT = `diag-pat-${ts}@test.somos-calma.com`
const PRO = `diag-pro-${ts}@test.somos-calma.com`
const PASS = 'DiagTest#2026x'

const supPat = createClient(URL, ANON)
const supPro = createClient(URL, ANON)

console.log('1) Signup paciente...')
let r = await supPat.auth.signUp({ email: PAT, password: PASS, options: { data: { full_name: 'Diag Paciente', role: 'patient' } } })
if (r.error) { console.error('FALLO signup paciente:', r.error); process.exit(1) }
r = await supPat.auth.signInWithPassword({ email: PAT, password: PASS })
if (r.error) { console.error('FALLO login paciente:', r.error); process.exit(1) }
console.log('   ok, sesión paciente:', r.data.user.id)

console.log('2) Signup profesional...')
let r2 = await supPro.auth.signUp({ email: PRO, password: PASS, options: { data: { full_name: 'Diag Profesional', role: 'professional' } } })
if (r2.error) { console.error('FALLO signup profesional:', r2.error); process.exit(1) }
r2 = await supPro.auth.signInWithPassword({ email: PRO, password: PASS })
if (r2.error) { console.error('FALLO login profesional:', r2.error); process.exit(1) }
console.log('   ok, sesión profesional:', r2.data.user.id)

const { execSync } = await import('node:child_process')
const { writeFileSync, rmSync } = await import('node:fs')
writeFileSync(`.tmp-diag-verify-${ts}.sql`, `alter table public.professional_profiles disable trigger enforce_professional_profile_update_restrictions;
update public.professional_profiles set verification_status='verified', is_visible=true
  where profile_id in (select id from auth.users where email='${PRO}');
alter table public.professional_profiles enable trigger enforce_professional_profile_update_restrictions;`)
execSync(`cd ../supabase && supabase db query --linked -f "${process.cwd()}/.tmp-diag-verify-${ts}.sql"`, { stdio: 'pipe' })
rmSync(`.tmp-diag-verify-${ts}.sql`)
console.log('3) Profesional verificado (para que el slot sea visible)')

const proUserId = supPro.auth.getUser().then((r) => r.data.user?.id)
const patUserId = supPat.auth.getUser().then((r) => r.data.user?.id)
const { data: proProfile, error: proErr } = await supPro.from('professional_profiles').select('id').eq('profile_id', await proUserId).single()
const { data: patProfile, error: patErr } = await supPat.from('patient_profiles').select('id').eq('profile_id', await patUserId).single()
if (proErr || patErr) console.log('   (errores subperfiles:', proErr?.message, patErr?.message, ')')
console.log('4) Subperfiles:', { pro: proProfile?.id, pat: patProfile?.id })

const sched = new Date(Date.now() + 7 * 86400_000)
sched.setHours(10, 0, 0, 0)
const insSlot = await supPro.from('availability_slots').insert({
  professional_profile_id: proProfile.id,
  slot_start: sched.toISOString(),
  slot_end: new Date(sched.getTime() + 50 * 60_000).toISOString(),
}).select()
if (insSlot.error) { console.error('FALLO slot:', insSlot.error); process.exit(1) }
console.log('5) Slot creado')

const insAppt = await supPat.from('appointments').insert({
  patient_profile_id: patProfile.id,
  professional_profile_id: proProfile.id,
  scheduled_at: sched.toISOString(),
  duration_minutes: 50,
  session_type: 'single',
  status: 'confirmed',
  notes: 'diag jaas',
}).select()
if (insAppt.error) { console.error('FALLO cita:', insAppt.error); process.exit(1) }
const appt = insAppt.data[0]
console.log('6) Cita creada:', appt.id, 'video_link:', appt.video_link)

console.log('7) invoke jaas-token como PACIENTE (mismo código que el navegador)...')
const invPat = await supPat.functions.invoke('jaas-token', { body: { appointmentId: appt.id } })
console.log('   error:', JSON.stringify(invPat.error))
console.log('   data keys:', invPat.data ? Object.keys(invPat.data) : invPat.data)
if (invPat.data?.jwt) {
  const [h] = invPat.data.jwt.split('.')
  console.log('   JWT header:', Buffer.from(h, 'base64url').toString())
}

console.log('8) invoke jaas-token como PROFESIONAL...')
const invPro = await supPro.functions.invoke('jaas-token', { body: { appointmentId: appt.id } })
console.log('   error:', JSON.stringify(invPro.error))
console.log('   moderator:', invPro.data?.moderator)

// Cleanup
const cleanup = [
  `DELETE FROM public.appointments WHERE id = '${appt.id}';`,
  `DELETE FROM public.availability_slots WHERE professional_profile_id = '${proProfile.id}';`,
  `DELETE FROM auth.users WHERE email IN ('${PAT}','${PRO}');`,
]
for (const stmt of cleanup) {
  writeFileSync(`.tmp-diag-del-${ts}.sql`, stmt)
  execSync(`cd ../supabase && supabase db query --linked -f "${process.cwd()}/.tmp-diag-del-${ts}.sql"`, { stdio: 'pipe' })
  rmSync(`.tmp-diag-del-${ts}.sql`)
}
console.log('9) Cleanup hecho')
