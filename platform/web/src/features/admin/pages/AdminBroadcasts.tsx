import { useEffect, useMemo, useState } from 'react'
import { Megaphone, Send } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/useAuth'
import { brandedEmail } from '@/lib/emailTemplate'
import { supabase } from '@/lib/supabase'

type Audience = 'all' | 'patients' | 'professionals'

/** Audiencia base del formulario (los subfiltros se resuelven en el frontend con only_emails). */
type Target = Audience | 'specific'

type PatientFilter = 'with_appointment' | 'with_completed_session' | 'without_appointments' | 'intake_completed'
type ProfessionalFilter =
  | 'verified'
  | 'pending_verification'
  | 'visible'
  | 'with_slots'
  | 'with_price'
  | 'without_documents'

type Broadcast = {
  id: string
  audience: Audience
  subject: string
  status: 'pending' | 'sent' | 'failed'
  recipient_count: number
  sent_count: number
  failed_count: number
  created_at: string
}

type UserOption = { email: string; full_name: string; role: 'patient' | 'professional' }

const TARGET_OPTIONS: { value: Target; label: string }[] = [
  { value: 'all', label: 'Ambos (pacientes y profesionales)' },
  { value: 'patients', label: 'Solo pacientes' },
  { value: 'professionals', label: 'Solo profesionales' },
  { value: 'specific', label: 'Personas específicas…' },
]

const PATIENT_FILTER_OPTIONS: { value: PatientFilter; label: string }[] = [
  { value: 'with_appointment', label: 'Con al menos una cita' },
  { value: 'with_completed_session', label: 'Con sesiones completadas' },
  { value: 'without_appointments', label: 'Sin citas' },
  { value: 'intake_completed', label: 'Completaron la encuesta de registro' },
]

const PROFESSIONAL_FILTER_OPTIONS: { value: ProfessionalFilter; label: string }[] = [
  { value: 'verified', label: 'Verificados' },
  { value: 'pending_verification', label: 'Pendientes de verificar' },
  { value: 'visible', label: 'Visibles en el directorio' },
  { value: 'with_slots', label: 'Con horarios publicados' },
  { value: 'with_price', label: 'Con precio capturado' },
  { value: 'without_documents', label: 'Sin documentos subidos' },
]

const TARGET_LABELS: Record<Target, string> = {
  all: 'Ambos (pacientes y profesionales)',
  patients: 'Pacientes',
  professionals: 'Profesionales',
  specific: 'Personas específicas',
}

/** "Pendientes de verificar" = todo lo que aún no es verified. */
const PENDING_STATUSES = ['pending', 'in_review', 'rejected']

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'Todos',
  patients: 'Pacientes',
  professionals: 'Profesionales',
}

const STATUS_LABELS: Record<Broadcast['status'], string> = {
  pending: 'Pendiente',
  sent: 'Enviado',
  failed: 'Fallido',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function bodyTextToHtml(bodyText: string): string {
  return bodyText
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('\n            ')
}

function broadcastPreviewHtml(subject: string, bodyText: string): string {
  return brandedEmail({
    title: subject || 'Asunto del comunicado',
    greeting: '',
    bodyHtml: bodyText ? bodyTextToHtml(bodyText) : '<p style="color:#999;">(Escribe el cuerpo del mensaje…)</p>',
  })
}

type ActiveProfile = { id: string; email: string; role: 'patient' | 'professional' }

async function fetchActiveProfiles(): Promise<ActiveProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .in('role', ['patient', 'professional'])
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  return (data ?? []) as ActiveProfile[]
}

/**
 * Resuelve la lista final de correos del objetivo. Los subfiltros se evalúan en el
 * frontend (la base de usuarios es pequeña) y se envían a la Edge Function vía only_emails.
 * Varios filtros seleccionados = UNIÓN (se envía a quien cumpla cualquiera de ellos).
 */
async function resolveTargetEmails(
  target: Target,
  patientFilters: PatientFilter[],
  professionalFilters: ProfessionalFilter[],
  specificEmails: string[]
): Promise<string[]> {
  if (target === 'specific') return specificEmails

  const profiles = await fetchActiveProfiles()
  const base =
    target === 'all'
      ? profiles
      : profiles.filter((p) => p.role === (target === 'patients' ? 'patient' : 'professional'))

  if (target === 'all') return base.map((p) => p.email)

  if (target === 'patients') {
    if (patientFilters.length === 0) return base.map((p) => p.email)
    const [{ data: appts, error: apptsErr }, { data: pats, error: patsErr }] = await Promise.all([
      supabase.from('appointments').select('patient_profile_id, status'),
      supabase.from('patient_profiles').select('id, profile_id, intake_completed_at'),
    ])
    if (apptsErr) throw new Error(apptsErr.message)
    if (patsErr) throw new Error(patsErr.message)

    const patientRows = (pats ?? []) as { id: string; profile_id: string; intake_completed_at: string | null }[]
    const ppIdToProfileId = new Map(patientRows.map((r) => [r.id, r.profile_id]))
    const appointmentRows = (appts ?? []) as { patient_profile_id: string; status: string }[]

    const withAnyAppt = new Set(
      appointmentRows.map((a) => ppIdToProfileId.get(a.patient_profile_id)).filter((v): v is string => Boolean(v))
    )
    const withCompleted = new Set(
      appointmentRows
        .filter((a) => a.status === 'completed')
        .map((a) => ppIdToProfileId.get(a.patient_profile_id))
        .filter((v): v is string => Boolean(v))
    )
    const withIntake = new Set(patientRows.filter((r) => r.intake_completed_at).map((r) => r.profile_id))
    const withoutAppt = new Set(patientRows.map((r) => r.profile_id).filter((id) => !withAnyAppt.has(id)))

    const sets: Record<PatientFilter, Set<string>> = {
      with_appointment: withAnyAppt,
      with_completed_session: withCompleted,
      without_appointments: withoutAppt,
      intake_completed: withIntake,
    }
    return base.filter((p) => patientFilters.some((f) => sets[f].has(p.id))).map((p) => p.email)
  }

  // Profesionales
  if (professionalFilters.length === 0) return base.map((p) => p.email)
  const [{ data: profs, error: profsErr }, { data: slots, error: slotsErr }, { data: docs, error: docsErr }] =
    await Promise.all([
      supabase.from('professional_profiles').select('profile_id, verification_status, is_visible, session_price'),
      supabase.from('availability_slots').select('professional_profile_id').gte('slot_end', new Date().toISOString()),
      supabase.from('professional_documents').select('professional_profile_id'),
    ])
  if (profsErr) throw new Error(profsErr.message)
  if (slotsErr) throw new Error(slotsErr.message)
  if (docsErr) throw new Error(docsErr.message)

  const profRows = (profs ?? []) as {
    profile_id: string
    verification_status: string
    is_visible: boolean
    session_price: number | null
  }[]
  const profIdsWithSlots = new Set(
    ((slots ?? []) as { professional_profile_id: string }[]).map((s) => s.professional_profile_id)
  )
  const profIdsWithDocs = new Set(
    ((docs ?? []) as { professional_profile_id: string }[]).map((d) => d.professional_profile_id)
  )

  const matches = (profileId: string, filter: ProfessionalFilter): boolean => {
    const row = profRows.find((r) => r.profile_id === profileId)
    if (!row) return false
    switch (filter) {
      case 'verified':
        return row.verification_status === 'verified'
      case 'pending_verification':
        return PENDING_STATUSES.includes(row.verification_status)
      case 'visible':
        return row.is_visible
      case 'with_slots':
        return profIdsWithSlots.has(profileId)
      case 'with_price':
        return row.session_price !== null
      case 'without_documents':
        return !profIdsWithDocs.has(profileId)
    }
  }
  return base.filter((p) => professionalFilters.some((f) => matches(p.id, f))).map((p) => p.email)
}

export function AdminBroadcasts() {
  const { user } = useAuth()
  const [target, setTarget] = useState<Target>('all')
  const [patientFilters, setPatientFilters] = useState<PatientFilter[]>([])
  const [professionalFilters, setProfessionalFilters] = useState<ProfessionalFilter[]>([])
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [recipients, setRecipients] = useState(0)
  const [items, setItems] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Selector de personas específicas
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [specificEmails, setSpecificEmails] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')

  // Audiencia base que se guarda en el historial (la tabla solo acepta estas)
  const audience: Audience = target === 'specific' ? 'all' : target

  const canSend =
    subject.trim().length > 0 &&
    bodyText.trim().length > 0 &&
    !sending &&
    (target !== 'specific' || specificEmails.length > 0)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data, error: queryError } = await supabase
        .from('email_broadcasts')
        .select('id, audience, subject, status, recipient_count, sent_count, failed_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (queryError) throw queryError
      setItems((data ?? []) as Broadcast[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Conteo de destinatarios según audiencia + filtros
  useEffect(() => {
    let cancelled = false
    resolveTargetEmails(target, patientFilters, professionalFilters, specificEmails)
      .then((emails) => {
        if (!cancelled) setRecipients(emails.length)
      })
      .catch((err) => {
        if (!cancelled) {
          setRecipients(0)
          setError(err instanceof Error ? err.message : 'No se pudo calcular los destinatarios.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [target, patientFilters, professionalFilters, specificEmails])

  // Catálogo de usuarios para el selector de destinatarios específicos
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('email, full_name, role')
          .in('role', ['patient', 'professional'])
          .eq('is_active', true)
          .order('full_name', { ascending: true })
        if (!cancelled) setUserOptions((data ?? []) as UserOption[])
      } catch {
        // Catálogo opcional: el selector simplemente queda vacío
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return userOptions
    return userOptions.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [userOptions, userSearch])

  function toggleSpecific(email: string) {
    setSpecificEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    )
  }

  function togglePatientFilter(filter: PatientFilter) {
    setPatientFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    )
  }

  function toggleProfessionalFilter(filter: ProfessionalFilter) {
    setProfessionalFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    )
  }

  const previewHtml = useMemo(
    () => broadcastPreviewHtml(subject.trim(), bodyText.trim()),
    [subject, bodyText]
  )

  const activeFilterCount =
    target === 'patients' ? patientFilters.length : target === 'professionals' ? professionalFilters.length : 0

  const filterSummary =
    target === 'patients'
      ? patientFilters.map((f) => PATIENT_FILTER_OPTIONS.find((o) => o.value === f)?.label).join(', ')
      : target === 'professionals'
        ? professionalFilters
            .map((f) => PROFESSIONAL_FILTER_OPTIONS.find((o) => o.value === f)?.label)
            .join(', ')
        : ''

  async function handleDryRun() {
    if (!user?.email || !canSend) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-broadcast', {
        body: { dry_run: true, to: user.email, subject: subject.trim(), body_text: bodyText.trim() },
      })
      if (invokeError) throw new Error(invokeError.message)
      if (!data?.ok) throw new Error(data?.error || 'El envío de prueba falló.')
      setNotice(`Copia de prueba enviada a ${user.email}. Revisa tu bandeja antes de enviar a todos.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la prueba.')
    } finally {
      setSending(false)
    }
  }

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const { data: broadcast, error: insertError } = await supabase
        .from('email_broadcasts')
        .insert({
          audience,
          subject: subject.trim(),
          body_text: bodyText.trim(),
          created_by: user?.id,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      // Cuando hay subfiltros o destinatarios específicos, la función los aplica vía only_emails
      let onlyEmails: string[] | undefined
      if (target === 'specific') {
        onlyEmails = specificEmails
      } else if (target === 'patients' && patientFilters.length > 0) {
        onlyEmails = await resolveTargetEmails(target, patientFilters, [], [])
      } else if (target === 'professionals' && professionalFilters.length > 0) {
        onlyEmails = await resolveTargetEmails(target, [], professionalFilters, [])
      }

      const { data, error: invokeError } = await supabase.functions.invoke('send-broadcast', {
        body: { broadcast_id: broadcast.id, ...(onlyEmails ? { only_emails: onlyEmails } : {}) },
      })
      if (invokeError) throw new Error(invokeError.message)
      if (!data?.ok) throw new Error(data?.error || 'El envío falló.')

      setNotice(`Comunicado enviado: ${data.sent} de ${data.recipients} destinatarios.`)
      setSubject('')
      setBodyText('')
      setConfirmOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el comunicado.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Comunicados</h1>
        <p className="text-text-light mt-1">
          Envía un correo a los usuarios de la plataforma (pacientes y/o profesionales).
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone size={18} /> Nuevo comunicado
            </CardTitle>
            <CardDescription>
              Los correos se envían desde hola@somos-calma.com con la plantilla de marca.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Audiencia"
              value={target}
              onChange={(e) => setTarget(e.target.value as Target)}
              options={TARGET_OPTIONS}
            />

            {target === 'patients' && (
              <fieldset className="space-y-2 rounded-sm border border-border p-3">
                <legend className="px-1 text-sm font-medium text-text">Filtros de pacientes</legend>
                {PATIENT_FILTER_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-primary-dark shrink-0"
                      checked={patientFilters.includes(option.value)}
                      onChange={() => togglePatientFilter(option.value)}
                    />
                    <span className="text-sm text-text">{option.label}</span>
                  </label>
                ))}
                <p className="text-xs text-text-light pt-1">
                  Sin marcar ninguno = todos los pacientes. Con varios marcados se envía a quien
                  cumpla <strong>cualquiera</strong> de ellos.
                </p>
              </fieldset>
            )}

            {target === 'professionals' && (
              <fieldset className="space-y-2 rounded-sm border border-border p-3">
                <legend className="px-1 text-sm font-medium text-text">Filtros de profesionales</legend>
                {PROFESSIONAL_FILTER_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-primary-dark shrink-0"
                      checked={professionalFilters.includes(option.value)}
                      onChange={() => toggleProfessionalFilter(option.value)}
                    />
                    <span className="text-sm text-text">{option.label}</span>
                  </label>
                ))}
                <p className="text-xs text-text-light pt-1">
                  Sin marcar ninguno = todos los profesionales. Con varios marcados se envía a quien
                  cumpla <strong>cualquiera</strong> de ellos.
                </p>
              </fieldset>
            )}

            {target === 'specific' && (
              <div className="space-y-2">
                <Input
                  label="Buscar destinatario"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Nombre o correo…"
                />
                <div className="max-h-56 overflow-y-auto rounded-sm border border-border divide-y divide-border bg-white">
                  {filteredUsers.map((u) => (
                    <label
                      key={u.email}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-bg-alt transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="accent-primary-dark shrink-0"
                        checked={specificEmails.includes(u.email)}
                        onChange={() => toggleSpecific(u.email)}
                      />
                      <span className="text-sm text-text flex-1 truncate">
                        {u.full_name || u.email}
                      </span>
                      <Badge variant={u.role === 'professional' ? 'info' : 'default'}>
                        {u.role === 'professional' ? 'Profesional' : 'Paciente'}
                      </Badge>
                    </label>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-sm text-text-light px-3 py-4 text-center">Sin resultados.</p>
                  )}
                </div>
                <p className="text-xs text-text-light">
                  {specificEmails.length} persona(s) seleccionada(s)
                </p>
              </div>
            )}

            <p className="text-sm text-text-light -mt-2">
              Destinatarios activos: <strong>{recipients}</strong>
            </p>
            <Input
              label="Asunto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Ej. Novedades de septiembre en SOMOS-CALMA"
            />
            <Textarea
              label="Mensaje"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={8}
              maxLength={5000}
              placeholder="Escribe el mensaje. Separa párrafos con una línea en blanco."
            />
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button variant="outline" onClick={handleDryRun} disabled={!canSend || !user?.email}>
                Enviarme una prueba
              </Button>
              <Button onClick={() => setConfirmOpen(true)} disabled={!canSend}>
                <Send size={16} className="mr-2" />
                Enviar a {recipients} personas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>Así se verá el correo en la bandeja del destinatario.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-md border border-border overflow-hidden bg-bg-alt"
              // El contenido se genera localmente a partir de campos escapados.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de envíos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Broadcast>
            rows={items}
            keyOf={(row) => row.id}
            loading={loading}
            emptyMessage="Aún no se han enviado comunicados."
            columns={[
              {
                header: 'Fecha',
                render: (row) =>
                  new Date(row.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
              },
              { header: 'Audiencia', render: (row) => AUDIENCE_LABELS[row.audience] ?? row.audience },
              { header: 'Asunto', render: (row) => <span className="text-text">{row.subject}</span> },
              {
                header: 'Estado',
                render: (row) => (
                  <Badge
                    variant={row.status === 'sent' ? 'success' : row.status === 'failed' ? 'error' : 'default'}
                  >
                    {STATUS_LABELS[row.status]}
                  </Badge>
                ),
              },
              {
                header: 'Enviados',
                render: (row) => `${row.sent_count}/${row.recipient_count}` +
                  (row.failed_count > 0 ? ` (${row.failed_count} fallidos)` : ''),
              },
            ]}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Enviar comunicado"
        message={
          <>
            Se enviará <strong>“{subject.trim()}”</strong> a{' '}
            <strong>{recipients} destinatarios</strong> (
            {TARGET_LABELS[target].toLowerCase()}
            {activeFilterCount > 0 && (
              <>
                {' '}
                · filtros: <strong>{filterSummary}</strong>
              </>
            )}
            ). Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Enviar ahora"
        loading={sending}
        onConfirm={handleSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
