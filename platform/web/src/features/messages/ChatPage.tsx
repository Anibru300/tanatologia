import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/useAuth'
import { ConversationThread } from './ConversationThread'
import {
  getMySubprofileId,
  listConversations,
  startConversation,
  subscribeToConversations,
} from './messagesService'
import type { ConversationSummary } from './types'

interface ChatPageProps {
  audience: 'patient' | 'professional'
  /** CTA del estado vacío */
  emptyActionTo: string
  emptyActionLabel: string
  /** Si viene de un acceso directo (?with=<profile_id>), abre esa conversación */
  initialCounterpartyId?: string | null
}

function formatPreviewTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function ChatPage({ audience, emptyActionTo, emptyActionLabel, initialCounterpartyId }: ChatPageProps) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [startingDirect, setStartingDirect] = useState(false)

  const refreshList = useCallback(async () => {
    if (!user) return
    try {
      const rows = await listConversations(audience)
      setConversations(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las conversaciones.')
    }
  }, [user, audience])

  // Carga inicial + acceso directo (?with=<profile_id>)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    async function init() {
      try {
        await refreshList()
        if (initialCounterpartyId) {
          setStartingDirect(true)
          const id = await startConversation(initialCounterpartyId)
          if (!cancelled) {
            await refreshList()
            setActiveId(id)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo iniciar la conversación.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setStartingDirect(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Suscripción en vivo a la lista (filtrada por subperfil propio)
  useEffect(() => {
    if (!user) return
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    getMySubprofileId(audience)
      .then((subId) => {
        if (cancelled) return
        unsubscribe = subscribeToConversations(audience, subId, () => {
          refreshList()
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [user, audience, refreshList])

  const active = conversations.find((c) => c.id === activeId) ?? null

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text">Mensajes</h1>
        <p className="text-text-light mt-1 text-sm">
          {audience === 'patient'
            ? 'Comunícate de forma segura con tus profesionales.'
            : 'Comunícate de forma segura con tus pacientes.'}
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {startingDirect && (
        <div className="mb-4">
          <Alert variant="info">Abriendo conversación…</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex-1 rounded-lg border border-border bg-surface p-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-md bg-bg-alt animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 && !startingDirect ? (
        <EmptyState
          icon={MessageSquare}
          title="Aún no tienes conversaciones"
          description={
            audience === 'patient'
              ? 'Cuando tengas una cita con un profesional podrás escribirle desde aquí o desde tus citas.'
              : 'Cuando un paciente agende contigo podrás escribirle desde aquí o desde tu lista de pacientes.'
          }
          actionLabel={emptyActionLabel}
          actionTo={emptyActionTo}
        />
      ) : (
        <div className="flex-1 rounded-lg border border-border bg-surface overflow-hidden">
          <div className="flex h-full">
            {/* Lista de conversaciones */}
            <div
              className={`w-full sm:w-80 sm:border-r border-border flex flex-col ${
                active ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="font-medium text-text">Conversaciones</p>
                <button
                  type="button"
                  aria-label="Actualizar lista"
                  onClick={refreshList}
                  className="p-1.5 rounded-full text-text-light hover:bg-bg-alt hover:text-text transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveId(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeId === conv.id ? 'bg-primary/10' : 'hover:bg-bg-alt'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary-dark flex items-center justify-center font-semibold shrink-0">
                      {conv.other.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-text truncate">{conv.other.full_name}</p>
                        <span className="text-[11px] text-text-light shrink-0">
                          {formatPreviewTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-text-light truncate">{conv.last_message ?? 'Sin mensajes aún'}</p>
                        {conv.unread_count > 0 && (
                          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-dark text-white text-[11px] font-semibold flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hilo activo */}
            <div className={`flex-1 flex flex-col ${active ? 'flex' : 'hidden sm:flex'}`}>
              {active && user ? (
                <ConversationThread
                  conversation={active}
                  myUserId={user.id}
                  onBack={() => setActiveId(null)}
                  onMessageSent={refreshList}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center text-text-light">
                    <MessageSquare size={40} className="mx-auto mb-3 text-primary/40" />
                    <p className="font-medium text-text">Selecciona una conversación</p>
                    <p className="text-sm mt-1">Elige un chat de la lista para ver los mensajes.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
