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

/** Audiencia extendida del formulario (los subfiltros se resuelven con only_emails). */
type Target = Audience | 'professionals_verified' | 'professionals_pending' | 'specific'

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
  { value: 'all', label: 'Todos (pacientes y profesionales)' },
  { value: 'patients', label: 'Solo pacientes' },
  { value: 'professionals', label: 'Solo profesionales (todos)' },
  { value: 'professionals_verified', label: 'Solo profesionales verificados' },
  { value: 'professionals_pending', label: 'Solo profesionales pendientes de verificar' },
  { value: 'specific', label: 'Personas específicas…' },
]

const TARGET_LABELS: Record<Target, string> = {
  all: 'Todos',
  patients: 'Pacientes',
  professionals: 'Profesionales (todos)',
  professionals_verified: 'Profesionales verificados',
  professionals_pending: 'Profesionales pendientes de verificar',
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

async function fetchProfessionalEmails(verificationStatuses: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, professional_profiles!inner(verification_status)')
    .eq('role', 'professional')
    .eq('is_active', true)
    .in('professional_profiles.verification_status', verificationStatuses)
  if (error) throw new Error(error.message)
  return ((data ?? []) as { email: string }[])
    .map((r) => r.email)
    .filter((e) => typeof e === 'string' && e.length > 0)
}

async function countRecipients(target: Target, specificEmails: string[]): Promise<number> {
  if (target === 'specific') return specificEmails.length
  if (target === 'professionals_verified') {
    return (await fetchProfessionalEmails(['verified'])).length
  }
  if (target === 'professionals_pending') {
    return (await fetchProfessionalEmails(PENDING_STATUSES)).length
  }
  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('role', ['patient', 'professional'])
    .eq('is_active', true)
  if (target === 'patients') query = query.eq('role', 'patient')
  if (target === 'professionals') query = query.eq('role', 'professional')
  const { count } = await query
  return count ?? 0
}

export function AdminBroadcasts() {
  const { user } = useAuth()
  const [target, setTarget] = useState<Target>('all')
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
  const audience: Audience =
    target === 'specific'
      ? 'all'
      : target === 'professionals_verified' || target === 'professionals_pending'
        ? 'professionals'
        : target

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
      setRecipients(await countRecipients(target, specificEmails))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    countRecipients(target, specificEmails).then(setRecipients).catch(() => setRecipients(0))
  }, [target, specificEmails])

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

  const previewHtml = useMemo(
    () => broadcastPreviewHtml(subject.trim(), bodyText.trim()),
    [subject, bodyText]
  )

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

      // Subfiltros y destinatarios específicos: la función los aplica sobre la audiencia
      let onlyEmails: string[] | undefined
      if (target === 'professionals_verified') {
        onlyEmails = await fetchProfessionalEmails(['verified'])
      } else if (target === 'professionals_pending') {
        onlyEmails = await fetchProfessionalEmails(PENDING_STATUSES)
      } else if (target === 'specific') {
        onlyEmails = specificEmails
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
            {TARGET_LABELS[target].toLowerCase()}). Esta acción no se puede deshacer.
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
