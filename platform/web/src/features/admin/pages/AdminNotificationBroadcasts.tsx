import { useEffect, useState } from 'react'
import { Bell, Send } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'

type Audience = 'all' | 'patients' | 'professionals'

type Broadcast = {
  id: string
  audience: Audience
  title: string
  status: 'pending' | 'sent' | 'failed'
  recipient_count: number
  sent_count: number
  failed_count: number
  created_at: string
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Todos (pacientes y profesionales)' },
  { value: 'patients', label: 'Solo pacientes' },
  { value: 'professionals', label: 'Solo profesionales' },
]

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

async function countRecipients(audience: Audience): Promise<number> {
  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('role', ['patient', 'professional'])
    .eq('is_active', true)
  if (audience === 'patients') query = query.eq('role', 'patient')
  if (audience === 'professionals') query = query.eq('role', 'professional')
  const { count } = await query
  return count ?? 0
}

export function AdminNotificationBroadcasts() {
  const { user } = useAuth()
  const [audience, setAudience] = useState<Audience>('all')
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [link, setLink] = useState('')
  const [recipients, setRecipients] = useState(0)
  const [items, setItems] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canSend = title.trim().length > 0 && bodyText.trim().length > 0 && !sending

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data, error: queryError } = await supabase
        .from('notification_broadcasts')
        .select('id, audience, title, status, recipient_count, sent_count, failed_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (queryError) throw queryError
      setItems((data ?? []) as Broadcast[])
      setRecipients(await countRecipients(audience))
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

  useEffect(() => {
    countRecipients(audience).then(setRecipients).catch(() => setRecipients(0))
  }, [audience])

  async function handleDryRun() {
    if (!canSend) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-notification-broadcast', {
        body: { dry_run: true, title: title.trim(), body: bodyText.trim(), link: link.trim() || null },
      })
      if (invokeError) throw new Error(invokeError.message)
      if (!data?.ok) throw new Error(data?.error || 'La notificación de prueba falló.')
      setNotice('Notificación de prueba creada. Revisa tu campana (icono de la esquina superior).')
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
        .from('notification_broadcasts')
        .insert({
          audience,
          title: title.trim(),
          body: bodyText.trim(),
          link: link.trim() || null,
          created_by: user?.id,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      const { data, error: invokeError } = await supabase.functions.invoke('send-notification-broadcast', {
        body: { broadcast_id: broadcast.id },
      })
      if (invokeError) throw new Error(invokeError.message)
      if (!data?.ok) throw new Error(data?.error || 'El envío falló.')

      setNotice(`Notificación enviada: ${data.sent} de ${data.recipients} destinatarios.`)
      setTitle('')
      setBodyText('')
      setLink('')
      setConfirmOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la notificación.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Notificaciones</h1>
        <p className="text-text-light mt-1">
          Envía una notificación in-app a los usuarios de la plataforma (pacientes y/o profesionales).
          Llega a la campana de cada usuario en tiempo real.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={18} /> Nueva notificación
            </CardTitle>
            <CardDescription>
              Ejemplos: “Recuerda subir tu foto de perfil”, “No has puesto tu precio por consulta”,
              “Hay una nueva actualización disponible”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Audiencia"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              options={AUDIENCE_OPTIONS}
            />
            <p className="text-sm text-text-light -mt-2">
              Destinatarios activos: <strong>{recipients}</strong>
            </p>
            <Input
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ej. Recuerda completar tu perfil"
            />
            <Textarea
              label="Mensaje"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder="Escribe el mensaje de la notificación."
            />
            <Input
              label="Enlace interno (opcional)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={200}
              placeholder="/profesional/perfil — a dónde llega el usuario al tocar la notificación"
            />
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button variant="outline" onClick={handleDryRun} disabled={!canSend}>
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
            <CardDescription>Así se verá en la campana del destinatario.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border bg-bg-alt p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-text text-sm">
                    {title.trim() || 'Título de la notificación'}
                  </p>
                  <p className="text-sm text-text-light mt-0.5 whitespace-pre-line">
                    {bodyText.trim() || 'Escribe el mensaje para verlo aquí.'}
                  </p>
                  {link.trim() && (
                    <p className="text-xs text-primary mt-1 truncate">Abre: {link.trim()}</p>
                  )}
                </div>
              </div>
            </div>
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
            emptyMessage="Aún no se han enviado notificaciones masivas."
            columns={[
              {
                header: 'Fecha',
                render: (row) =>
                  new Date(row.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
              },
              { header: 'Audiencia', render: (row) => AUDIENCE_LABELS[row.audience] ?? row.audience },
              { header: 'Título', render: (row) => <span className="text-text">{row.title}</span> },
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
        title="Enviar notificación"
        message={
          <>
            Se enviará <strong>“{title.trim()}”</strong> a{' '}
            <strong>{recipients} destinatarios</strong> (
            {AUDIENCE_LABELS[audience].toLowerCase()}). Esta acción no se puede deshacer.
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
