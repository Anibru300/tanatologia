import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'
import { Inbox as InboxIcon, Send, Paperclip, MailOpen, Mail, RotateCcw } from 'lucide-react'

interface InboxMessage {
  id: string
  direction: 'in' | 'out'
  from_email: string
  from_name: string | null
  to_email: string
  subject: string | null
  text_body: string | null
  html_body: string | null
  thread_root_id: string | null
  attachments: { name: string; size: number; content_type: string; path: string }[]
  is_read: boolean
  received_at: string
}

interface Thread {
  key: string
  subject: string
  messages: InboxMessage[] // ordenadas de más antiguo a más reciente
  unread: number
  lastAt: string
}

function threadKeyOf(m: InboxMessage): string {
  return m.thread_root_id ?? m.id
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminInbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [openingAttachment, setOpeningAttachment] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const { data, error: queryError } = await supabase
        .from('email_inbox')
        .select(
          'id, direction, from_email, from_name, to_email, subject, text_body, html_body, thread_root_id, attachments, is_read, received_at'
        )
        .order('received_at', { ascending: false })
        .limit(500)
      if (queryError) throw new Error('No se pudo cargar la bandeja.')
      setMessages((data as InboxMessage[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la bandeja.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: avisar en cuanto llega un correo nuevo (la función inbound-email inserta).
  useEffect(() => {
    const suffix = Math.random().toString(36).slice(2, 8)
    const channel = supabase
      .channel(`email-inbox:${suffix}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'email_inbox' }, () => {
        setNotice('Nuevo correo recibido.')
        void load()
      })
      .subscribe()
    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [load])

  const threads = useMemo<Thread[]>(() => {
    const byKey = new Map<string, InboxMessage[]>()
    for (const m of messages) {
      const key = threadKeyOf(m)
      const list = byKey.get(key) ?? []
      list.push(m)
      byKey.set(key, list)
    }
    const result: Thread[] = []
    for (const [key, list] of byKey) {
      const sorted = [...list].sort((a, b) => a.received_at.localeCompare(b.received_at))
      const last = sorted[sorted.length - 1]
      result.push({
        key,
        subject: last.subject ?? sorted[0].subject ?? '(sin asunto)',
        messages: sorted,
        unread: sorted.filter((m) => m.direction === 'in' && !m.is_read).length,
        lastAt: last.received_at,
      })
    }
    return result.sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  }, [messages])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.messages.some(
          (m) =>
            m.from_email.toLowerCase().includes(q) ||
            (m.from_name ?? '').toLowerCase().includes(q) ||
            (m.text_body ?? '').toLowerCase().includes(q)
        )
    )
  }, [threads, search])

  const selected = threads.find((t) => t.key === selectedKey) ?? null

  // Último mensaje entrante del hilo: es al que se responde.
  const lastInbound = useMemo(() => {
    if (!selected) return null
    for (let i = selected.messages.length - 1; i >= 0; i--) {
      if (selected.messages[i].direction === 'in') return selected.messages[i]
    }
    return null
  }, [selected])

  async function openThread(t: Thread) {
    setSelectedKey(t.key)
    setReplyText('')
    setNotice('')
    const unreadIds = t.messages.filter((m) => m.direction === 'in' && !m.is_read).map((m) => m.id)
    if (unreadIds.length === 0) return
    // Marcar leídos (RLS admin UPDATE). Optimista en el estado local.
    setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m)))
    const { error: upErr } = await supabase.from('email_inbox').update({ is_read: true }).in('id', unreadIds)
    if (upErr) void load()
  }

  async function markUnread(t: Thread) {
    const ids = t.messages.filter((m) => m.direction === 'in').map((m) => m.id)
    if (ids.length === 0) return
    setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, is_read: false } : m)))
    const { error: upErr } = await supabase.from('email_inbox').update({ is_read: false }).in('id', ids)
    if (upErr) setError('No se pudo marcar como no leído.')
  }

  async function openAttachment(path: string) {
    setOpeningAttachment(path)
    try {
      const { data, error: signErr } = await supabase.storage.from('email-attachments').createSignedUrl(path, 3600)
      if (signErr || !data) throw new Error('No se pudo abrir el adjunto.')
      window.open(data.signedUrl, '_blank', 'noopener')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el adjunto.')
    } finally {
      setOpeningAttachment('')
    }
  }

  async function sendReply() {
    if (!lastInbound || !replyText.trim()) return
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
      setNotice('Respuesta enviada.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la respuesta.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Bandeja de entrada</h1>
        <p className="text-text-light mt-1">
          Correos recibidos en hola@somos-calma.com. Lee y responde sin salir del panel.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ------------------------------------------------ Lista de hilos */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por remitente, asunto o texto…"
                aria-label="Buscar correos"
                className="w-full px-4 py-2.5 rounded-sm border border-border bg-surface text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            {loading ? (
              <SkeletonRows count={6} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={InboxIcon}
                title={search ? 'Sin resultados' : 'Bandeja vacía'}
                description={
                  search
                    ? 'No hay correos que coincidan con la búsqueda.'
                    : 'Los correos que lleguen a hola@somos-calma.com aparecerán aquí.'
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((t) => {
                  const last = t.messages[t.messages.length - 1]
                  const sender =
                    last.direction === 'in'
                      ? last.from_name || last.from_email
                      : `Tú → ${last.to_email}`
                  return (
                    <li key={t.key}>
                      <button
                        type="button"
                        onClick={() => void openThread(t)}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-bg-alt ${
                          selectedKey === t.key ? 'bg-bg-alt' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-sm ${
                              t.unread > 0 ? 'font-semibold text-text' : 'text-text-light'
                            }`}
                          >
                            {sender}
                          </span>
                          <span className="shrink-0 text-xs text-muted">{formatDate(t.lastAt)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="truncate text-sm text-text">{t.subject}</span>
                          {t.unread > 0 && <Badge variant="success">{t.unread} nuevo{t.unread > 1 ? 's' : ''}</Badge>}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------ Hilo + respuesta */}
        <div className="lg:col-span-3 space-y-6">
          {!selected ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={MailOpen}
                  title="Selecciona un correo"
                  description="Elige una conversación de la lista para leerla y responder."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
                    <h2 className="text-lg font-semibold text-text truncate">{selected.subject}</h2>
                    <Button variant="ghost" size="sm" onClick={() => void markUnread(selected)}>
                      <RotateCcw size={16} className="mr-1" />
                      Marcar no leído
                    </Button>
                  </div>
                  <ul className="divide-y divide-border">
                    {selected.messages.map((m) => (
                      <li key={m.id} className="px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-sm">
                            {m.direction === 'in' ? (
                              <Mail size={14} className="text-primary" />
                            ) : (
                              <Send size={14} className="text-secondary-dark" />
                            )}
                            <span className="font-medium text-text">
                              {m.direction === 'in' ? m.from_name || m.from_email : 'Tú (SOMOS-CALMA)'}
                            </span>
                            <span className="text-muted">
                              {m.direction === 'in' ? `<${m.from_email}>` : `→ ${m.to_email}`}
                            </span>
                          </div>
                          <span className="text-xs text-muted">{formatDate(m.received_at)}</span>
                        </div>

                        {m.text_body ? (
                          <p className="whitespace-pre-wrap text-sm text-text leading-relaxed">{m.text_body}</p>
                        ) : m.html_body ? (
                          <iframe
                            title={`Mensaje ${m.id}`}
                            sandbox=""
                            srcDoc={m.html_body}
                            className="w-full min-h-[240px] rounded-sm border border-border bg-surface"
                          />
                        ) : (
                          <p className="text-sm text-muted italic">(Sin contenido)</p>
                        )}

                        {m.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {m.attachments.map((att) => (
                              <button
                                key={att.path}
                                type="button"
                                disabled={openingAttachment === att.path}
                                onClick={() => void openAttachment(att.path)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border bg-bg-alt text-xs text-text hover:bg-surface transition-colors disabled:opacity-50"
                              >
                                <Paperclip size={12} />
                                {att.name}
                                <span className="text-muted">({formatSize(att.size)})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* ------------------------------------------------ Composer */}
              {lastInbound ? (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm text-text-light">
                      Responder a <strong className="text-text">{lastInbound.from_email}</strong>
                    </p>
                    <Textarea
                      label="Tu respuesta"
                      rows={6}
                      maxLength={10000}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribe tu respuesta…"
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => void sendReply()} disabled={sending || !replyText.trim()}>
                        {sending ? (
                          <>
                            <Skeleton className="h-4 w-4 rounded-full" /> Enviando…
                          </>
                        ) : (
                          <>
                            <Send size={16} className="mr-2" /> Enviar respuesta
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Alert variant="info">
                  Este hilo solo contiene mensajes enviados desde el panel; no hay un remitente externo al
                  que responder.
                </Alert>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
