import { useCallback, useEffect, useState } from 'react'
import { Download, Eye, FileText, ShieldAlert, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  adminListConversations,
  getAttachmentUrl,
  listMessages,
  moderateMessage,
  type AdminConversation,
} from '@/features/messages/messagesService'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/features/messages/types'
import { isImageMime } from '@/features/messages/types'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ModeratedAttachment({ message }: { message: ChatMessage }) {
  const [url, setUrl] = useState<string | null>(null)
  const attachment = message.attachment

  useEffect(() => {
    if (!attachment) return
    let cancelled = false
    getAttachmentUrl(attachment.path)
      .then((u) => {
        if (!cancelled) setUrl(u)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [attachment])

  if (!attachment) return null

  if (isImageMime(attachment.mime)) {
    return url ? (
      <img src={url} alt={attachment.name} className="max-w-[200px] max-h-[200px] rounded-sm object-cover" loading="lazy" />
    ) : (
      <div className="w-[120px] h-[80px] rounded-sm bg-bg-alt animate-pulse" />
    )
  }

  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-sm bg-primary/10 px-3 py-2 text-sm text-primary-dark hover:bg-primary/15"
    >
      <FileText size={16} />
      {attachment.name}
      <Download size={14} />
    </a>
  )
}

type SenderInfo = { name: string; role: string }

export function AdminChats() {
  const [items, setItems] = useState<AdminConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<AdminConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [senders, setSenders] = useState<Map<string, SenderInfo>>(new Map())
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState('')

  const [toDelete, setToDelete] = useState<ChatMessage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await adminListConversations())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las conversaciones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openThread(conv: AdminConversation) {
    setSelected(conv)
    setLoadingThread(true)
    setThreadError('')
    setActionSuccess('')
    setActionError('')
    try {
      const rows = await listMessages(conv.id, 200)
      setMessages(rows.reverse())

      // Nombre y rol de cada remitente (para el badge del mensaje)
      const senderIds = [...new Set(rows.map((m) => m.sender_profile_id))]
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', senderIds)
        setSenders(
          new Map(
            (profiles || []).map((p) => [
              String(p.id),
              { name: String(p.full_name ?? 'Usuario'), role: String(p.role ?? '') },
            ])
          )
        )
      }
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes.')
    } finally {
      setLoadingThread(false)
    }
  }

  async function handleDelete() {
    if (!toDelete || deleting) return
    setDeleting(true)
    setActionError('')
    setActionSuccess('')
    try {
      await moderateMessage(toDelete.id)
      setMessages((prev) =>
        prev.map((m) => (m.id === toDelete.id ? { ...m, deleted_by_moderation: true } : m))
      )
      setActionSuccess('Mensaje eliminado. Los participantes lo verán como "eliminado por moderación".')
      setToDelete(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo eliminar el mensaje.')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = items.filter((item) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return item.patient_name.toLowerCase().includes(term) || item.professional_name.toLowerCase().includes(term)
  })

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Supervisión de chats</h1>
          <p className="text-text-light">
            Lectura silenciosa de las conversaciones entre pacientes y profesionales. Los participantes no ven cuándo
            revisas un chat ni quién eliminó un mensaje.
          </p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert size={20} className="text-primary-dark" />
              Conversaciones
            </CardTitle>
            <CardDescription>{items.length} conversaciones registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 max-w-sm">
              <Input
                label="Buscar por nombre"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Paciente o profesional…"
              />
            </div>
            <DataTable
              loading={loading}
              rows={filtered}
              keyOf={(item) => item.id}
              emptyMessage="No hay conversaciones registradas."
              caption="Conversaciones de la plataforma"
              columns={[
                {
                  header: 'Paciente',
                  render: (item) => <span className="text-text">{item.patient_name}</span>,
                },
                {
                  header: 'Profesional',
                  render: (item) => <span className="text-text">{item.professional_name}</span>,
                },
                {
                  header: 'Mensajes',
                  render: (item) => <Badge variant="info">{item.message_count}</Badge>,
                },
                {
                  header: 'Última actividad',
                  render: (item) => (
                    <span className="text-text-light">{formatDateTime(item.last_message_at)}</span>
                  ),
                },
                {
                  header: 'Acciones',
                  render: (item) => (
                    <Button variant="outline" size="sm" onClick={() => openThread(item)}>
                      <Eye size={14} className="mr-1" />
                      Ver chat
                    </Button>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Modal
          open={selected !== null}
          onClose={() => setSelected(null)}
          title={selected ? `${selected.patient_name} ↔ ${selected.professional_name}` : ''}
          className="max-w-2xl"
        >
          {selected && (
            <div>
              {actionSuccess && <Alert variant="success" className="mb-3">{actionSuccess}</Alert>}
              {actionError && <Alert variant="error" className="mb-3">{actionError}</Alert>}
              {threadError && <Alert variant="error" className="mb-3">{threadError}</Alert>}

              {loadingThread ? (
                <div className="space-y-3 py-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-md bg-bg-alt animate-pulse" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-text-light text-sm py-6 text-center">Esta conversación no tiene mensajes.</p>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {messages.map((msg) => {
                    const sender = senders.get(msg.sender_profile_id)
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          msg.deleted_by_moderation
                            ? 'border-border bg-bg-alt/60'
                            : 'border-border bg-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="flex items-center gap-2">
                            <Badge variant={sender?.role === 'professional' ? 'info' : 'default'}>
                              {sender?.role === 'professional' ? 'Profesional' : 'Paciente'}
                            </Badge>
                            <span className="text-text font-medium">{sender?.name ?? 'Usuario'}</span>
                          </span>
                          <span className="text-[11px] text-text-light">{formatDateTime(msg.created_at)}</span>
                        </div>
                        {msg.deleted_by_moderation ? (
                          <p className="italic text-text-light">Mensaje eliminado por moderación</p>
                        ) : (
                          <>
                            {msg.attachment && (
                              <div className="mb-2">
                                <ModeratedAttachment message={msg} />
                              </div>
                            )}
                            {msg.content && (
                              <p className="text-text whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                          </>
                        )}
                        {!msg.deleted_by_moderation && (
                          <div className="mt-2 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setToDelete(msg)}>
                              <Trash2 size={14} className="mr-1 text-error" />
                              Eliminar
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Modal>

        <ConfirmDialog
          open={toDelete !== null}
          onCancel={() => setToDelete(null)}
          onConfirm={handleDelete}
          title="Eliminar mensaje"
          message="El mensaje se marcará como eliminado por moderación. Los participantes verán ese aviso, pero no sabrán quién lo eliminó. Esta acción no se puede deshacer."
          confirmLabel={deleting ? 'Eliminando…' : 'Eliminar mensaje'}
          cancelLabel="Cancelar"
          destructive
          loading={deleting}
        />
      </div>
    </div>
  )
}
