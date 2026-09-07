import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, FileText, Image as ImageIcon, Paperclip, Send, X } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  getAttachmentUrl,
  listMessages,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
  uploadAttachment,
} from './messagesService'
import type { ChatAttachment, ChatMessage, ConversationSummary } from './types'
import { isImageMime } from './types'

interface ConversationThreadProps {
  conversation: ConversationSummary
  myUserId: string
  onBack?: () => void
  onMessageSent?: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function AttachmentView({ attachment, mine }: { attachment: ChatAttachment; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAttachmentUrl(attachment.path)
      .then((u) => {
        if (!cancelled) setUrl(u)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el archivo.')
      })
    return () => {
      cancelled = true
    }
  }, [attachment.path])

  const linkStyle = mine ? 'text-white underline' : 'text-primary-dark underline'

  if (error) return <p className="text-xs italic opacity-80">{error}</p>

  if (isImageMime(attachment.mime)) {
    return (
      <>
        {url ? (
          <button type="button" onClick={() => setPreviewOpen(true)} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/60 rounded-sm">
            <img
              src={url}
              alt={attachment.name}
              className="max-w-[220px] max-h-[220px] rounded-sm object-cover"
              loading="lazy"
            />
          </button>
        ) : (
          <div className="w-[120px] h-[90px] rounded-sm bg-black/10 animate-pulse" aria-label="Cargando imagen" />
        )}
        <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={attachment.name} className="max-w-3xl">
          {url && <img src={url} alt={attachment.name} className="w-full rounded-sm" />}
          <div className="mt-4 text-right">
            <a href={url ?? '#'} download={attachment.name} target="_blank" rel="noopener noreferrer" className={linkStyle}>
              <Download size={14} className="inline mr-1" />
              Descargar
            </a>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      className={`flex items-center gap-2 rounded-sm p-2 min-w-[180px] max-w-[240px] ${
        mine ? 'bg-white/15 hover:bg-white/20' : 'bg-primary/10 hover:bg-primary/15'
      } transition-colors`}
      onClick={(e) => {
        if (!url) e.preventDefault()
      }}
    >
      <FileText size={20} className="shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-medium truncate">{attachment.name}</span>
        <span className="block text-xs opacity-75">{Math.round(attachment.size / 1024)} KB · PDF</span>
      </span>
      <Download size={16} className="shrink-0 ml-auto opacity-75" />
    </a>
  )
}

export function ConversationThread({ conversation, myUserId, onBack, onMessageSent }: ConversationThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const conversationId = conversation.id

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const rows = await listMessages(conversationId, 50)
      setHasMore(rows.length === 50)
      setMessages((prev) => {
        // Conserva mensajes propios muy recientes que aún no aparecen en el fetch
        const ownNew = prev.filter(
          (m) => m.sender_profile_id === myUserId && !rows.some((r) => r.id === m.id)
        )
        return [...rows].reverse().concat(ownNew)
      })
    } catch {
      // Error silencioso en refresco en vivo; el estado de error solo aplica a la carga inicial
    }
  }, [conversationId, myUserId])

  // Carga inicial
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    listMessages(conversationId, 50)
      .then((rows) => {
        if (cancelled) return
        setHasMore(rows.length === 50)
        setMessages(rows.reverse())
        setLoading(false)
        setTimeout(scrollToBottom, 0)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, scrollToBottom])

  // Suscripción en vivo + marca leído
  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversationId, () => {
      refresh()
    })
    markConversationRead(conversationId).catch(() => {})
    return unsubscribe
  }, [conversationId, refresh])

  // Marca leído cuando llegan mensajes con el hilo abierto
  useEffect(() => {
    const hasUnread = messages.some((m) => m.sender_profile_id !== myUserId && m.read_at === null)
    if (hasUnread) {
      markConversationRead(conversationId).catch(() => {})
      onMessageSent?.()
    }
  }, [messages, myUserId, conversationId, onMessageSent])

  // Scroll al fondo cuando crece la conversación (si ya estaba cerca del fondo)
  const lastMessageId = messages[messages.length - 1]?.id
  useEffect(() => {
    scrollToBottom()
  }, [lastMessageId, scrollToBottom])

  async function loadOlder() {
    const oldest = messages[0]
    if (!oldest) return
    try {
      const older = await listMessages(conversationId, 50, oldest.created_at)
      setHasMore(older.length === 50)
      setMessages((prev) => older.reverse().concat(prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar mensajes anteriores.')
    }
  }

  async function handleSend() {
    const text = draft.trim()
    if ((!text && !pendingFile) || sending) return
    setSending(true)
    setError('')
    try {
      let attachment: ChatAttachment | null = null
      if (pendingFile) {
        attachment = await uploadAttachment(conversationId, pendingFile)
      }
      await sendMessage(conversationId, text, attachment)
      setDraft('')
      setPendingFile(null)
      await refresh()
      onMessageSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  function pickFile(file: File | null) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo supera el límite de 10 MB.')
      return
    }
    setError('')
    setPendingFile(file)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver a conversaciones"
            className="sm:hidden p-2 -ml-2 rounded-full text-text-light hover:bg-bg-alt hover:text-text transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary-dark flex items-center justify-center font-semibold shrink-0">
          {conversation.other.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-text truncate">{conversation.other.full_name}</p>
          <p className="text-xs text-text-light">Conversación segura dentro de la plataforma</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-bg-alt/40">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-10 w-2/3 rounded-md animate-pulse ${i % 2 ? 'ml-auto bg-primary/10' : 'bg-border/60'}`} />
            ))}
          </div>
        ) : error && messages.length === 0 ? (
          <Alert variant="error">{error}</Alert>
        ) : messages.length === 0 ? (
          <p className="text-center text-text-light text-sm py-8">
            Aún no hay mensajes. Saluda a {conversation.other.full_name.split(' ')[0]} 👋
          </p>
        ) : (
          <>
            {hasMore && (
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={loadOlder}>
                  Cargar mensajes anteriores
                </Button>
              </div>
            )}
            {messages.map((msg) => {
              const mine = msg.sender_profile_id === myUserId
              if (msg.deleted_by_moderation) {
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-xs italic text-text-light/70 px-3 py-2">Mensaje eliminado por moderación</p>
                  </div>
                )
              }
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                      mine ? 'bg-primary-dark text-white rounded-br-sm' : 'bg-surface border border-border text-text rounded-bl-sm'
                    }`}
                  >
                    {msg.attachment && (
                      <div className={msg.content ? 'mb-2' : ''}>
                        <AttachmentView attachment={msg.attachment} mine={mine} />
                      </div>
                    )}
                    {msg.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                    <p className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-text-light/70'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error de envío */}
      {error && messages.length > 0 && (
        <div className="px-4 pt-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Archivo pendiente */}
      {pendingFile && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
          {pendingFile.type.startsWith('image/') ? <ImageIcon size={16} className="text-primary-dark" /> : <FileText size={16} className="text-primary-dark" />}
          <span className="truncate flex-1 text-text">{pendingFile.name}</span>
          <span className="text-text-light text-xs">{Math.round(pendingFile.size / 1024)} KB</span>
          <button
            type="button"
            aria-label="Quitar archivo"
            onClick={() => setPendingFile(null)}
            className="p-1 rounded-full text-text-light hover:bg-bg-alt hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Entrada */}
      <div className="px-4 py-3 border-t border-border bg-surface">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            aria-label="Adjuntar archivo"
            onChange={(e) => {
              pickFile(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            aria-label="Adjuntar foto o PDF"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full text-text-light hover:bg-bg-alt hover:text-primary-dark transition-colors shrink-0"
          >
            <Paperclip size={20} />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Escribe un mensaje… (Enter para enviar)"
            className="flex-1 resize-none rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text placeholder:text-text-light/60 focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-32"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || (!draft.trim() && !pendingFile)}
            className="shrink-0 px-3"
            aria-label="Enviar mensaje"
          >
            <Send size={18} />
          </Button>
        </div>
        <p className="text-[11px] text-text-light/70 mt-1.5">Fotos y PDF de máx. 10 MB. No compartas contraseñas ni datos bancarios.</p>
      </div>
    </div>
  )
}
