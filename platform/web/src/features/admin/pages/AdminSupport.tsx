import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { Headphones, Send, MailOpen, CheckCircle } from 'lucide-react'

interface InboxMessage {
  id: string
  direction: 'in' | 'out'
  from_email: string
  from_name: string | null
  subject: string | null
  text_body: string | null
  thread_root_id: string | null
  is_read: boolean
  received_at: string
}

interface SupportThread {
  key: string
  subject: string
  userLabel: string
  messages: InboxMessage[] // de más antiguo a más reciente
  answered: boolean
  unread: number
  lastAt: string
}

const SUPPORT_PREFIX = '[Soporte '

function threadKeyOf(m: InboxMessage): string {
  return m.thread_root_id ?? m.id
}

function cleanSubject(subject: string | null): string {
  if (!subject) return '(sin asunto)'
  return subject.startsWith(SUPPORT_PREFIX) && subject.includes('] ')
    ? subject.slice(subject.indexOf('] ') + 2)
    : subject
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminSupport() {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('email_inbox')
        .select('id, direction, from_email, from_name, subject, text_body, thread_root_id, is_read, received_at')
        .order('received_at', { ascending: false })
        .limit(500)
      if (queryError) throw new Error('No se pudo cargar la bandeja.')
      setMessages((data as InboxMessage[]) ?? [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la bandeja.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const threads = useMemo<SupportThread[]>(() => {
    const support = messages.filter((m) => m.subject?.startsWith(SUPPORT_PREFIX))
    const byKey = new Map<string, InboxMessage[]>()
    for (const m of support) {
      const key = threadKeyOf(m)
      const arr = byKey.get(key) ?? []
      arr.push(m)
      byKey.set(key, arr)
    }
    return [...byKey.entries()]
      .map(([key, msgs]) => {
        const sorted = [...msgs].sort((a, b) => a.received_at.localeCompare(b.received_at))
        const last = sorted[sorted.length - 1]
        const firstInbound = sorted.find((m) => m.direction === 'in')
        return {
          key,
          subject: cleanSubject(firstInbound?.subject ?? last.subject),
          userLabel: firstInbound
            ? `${firstInbound.from_name ?? ''} <${firstInbound.from_email}>`.trim()
            : last.from_email,
          messages: sorted,
          answered: sorted.some((m) => m.direction === 'out'),
          unread: sorted.filter((m) => m.direction === 'in' && !m.is_read).length,
          lastAt: last.received_at,
        }
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  }, [messages])

  const stats = useMemo(
    () => ({
      total: threads.length,
      open: threads.filter((t) => !t.answered).length,
      done: threads.filter((t) => t.answered).length,
    }),
    [threads],
  )

  const selected = threads.find((t) => t.key === selectedKey) ?? null

  function openThread(t: SupportThread) {
    setSelectedKey(t.key)
    setReplyText('')
    setNotice('')
    const unreadIds = t.messages.filter((m) => m.direction === 'in' && !m.is_read).map((m) => m.id)
    if (unreadIds.length === 0) return
    setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m)))
    supabase
      .from('email_inbox')
      .update({ is_read: true })
      .in('id', unreadIds)
      .then(({ error: upErr }) => {
        if (upErr) void load()
      })
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    const lastInbound = [...selected.messages].reverse().find((m) => m.direction === 'in')
    if (!lastInbound) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('inbox-reply', {
        body: { inbox_id: lastInbound.id, text: replyText.trim() },
      })
      if (invokeError) throw new Error(invokeError.message)
      if (!data?.ok) throw new Error(data?.error || 'No se pudo enviar la respuesta.')
      setReplyText('')
      setNotice('Respuesta enviada al correo del usuario.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la respuesta.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="section-calma">
        <div className="container-calma">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">Soporte</h1>
            <p className="text-text-light">Tickets y solicitudes de ayuda.</p>
          </div>
          <SkeletonRows count={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Soporte</h1>
          <p className="text-text-light">
            Solicitudes de ayuda que envían pacientes y profesionales desde su portal.
          </p>
        </div>

        <Alert variant="info" className="mb-6">
          Cada solicitud también llega a la{' '}
          <Link to="/admin/bandeja" className="underline font-medium">Bandeja</Link>. Responde donde
          prefieras: la respuesta se envía al correo del usuario y el estado se sincroniza en ambas.
        </Alert>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-text">{stats.open}</p>
              <p className="text-xs text-text-light">Sin responder</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-text">{stats.done}</p>
              <p className="text-xs text-text-light">Atendidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-text">{stats.total}</p>
              <p className="text-xs text-text-light">Total</p>
            </CardContent>
          </Card>
        </div>

        {threads.length === 0 ? (
          <EmptyState
            icon={Headphones}
            title="No hay solicitudes de soporte"
            description="Cuando un paciente o profesional escriba desde su sección de Ayuda, aparecerá aquí."
          />
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {threads.map((t) => (
                    <li key={t.key}>
                      <button
                        type="button"
                        onClick={() => openThread(t)}
                        className={cn(
                          'w-full text-left p-4 transition-colors',
                          selectedKey === t.key ? 'bg-primary/10' : 'hover:bg-bg',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-text truncate">{t.subject}</p>
                            <p className="text-xs text-text-light truncate">{t.userLabel}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.unread > 0 && <Badge variant="info">{t.unread} nuevo</Badge>}
                            {t.answered ? (
                              <Badge variant="success">
                                <CheckCircle size={12} className="mr-1" /> Atendida
                              </Badge>
                            ) : (
                              <Badge variant="warning">Sin responder</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-text-light mt-1">{formatDate(t.lastAt)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                {!selected ? (
                  <div className="text-center py-12 text-text-light">
                    <MailOpen size={48} className="mx-auto mb-4 text-muted" />
                    <p>Selecciona una solicitud para ver la conversación.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="font-semibold text-text mb-1">{selected.subject}</h2>
                    <p className="text-xs text-text-light mb-4">{selected.userLabel}</p>
                    <div className="space-y-3 mb-4">
                      {selected.messages.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            'rounded-md p-3 max-w-[90%]',
                            m.direction === 'out'
                              ? 'ml-auto bg-primary text-white'
                              : 'bg-bg text-text',
                          )}
                        >
                          <p className="text-xs opacity-70 mb-1">
                            {m.direction === 'out' ? 'Tú (SOMOS-CALMA)' : selected.userLabel} ·{' '}
                            {formatDate(m.received_at)}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{m.text_body || '(sin contenido)'}</p>
                        </div>
                      ))}
                    </div>
                    {notice && <Alert variant="success" className="mb-3">{notice}</Alert>}
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribe la respuesta… llegará al correo del usuario."
                      rows={4}
                    />
                    <Button
                      className="mt-3 gap-2"
                      onClick={() => void sendReply()}
                      disabled={sending || !replyText.trim()}
                    >
                      <Send size={16} />
                      {sending ? 'Enviando…' : 'Enviar respuesta'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
