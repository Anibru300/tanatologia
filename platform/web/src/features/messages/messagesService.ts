import { supabase } from '@/lib/supabase'
import type { ChatAttachment, ChatMessage, ConversationSummary } from './types'
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE } from './types'

const CHAT_BUCKET = 'chat-attachments'
const SIGNED_URL_TTL = 3600

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    sender_profile_id: String(row.sender_profile_id),
    content: row.content ? String(row.content) : '',
    attachment:
      row.attachment_path != null
        ? {
            path: String(row.attachment_path),
            name: String(row.attachment_name ?? 'archivo'),
            size: Number(row.attachment_size ?? 0),
            mime: String(row.attachment_mime ?? ''),
          }
        : null,
    deleted_by_moderation: Boolean(row.deleted_by_moderation),
    read_at: row.read_at ? String(row.read_at) : null,
    created_at: String(row.created_at),
  }
}

/** Subperfil propio (patient_profiles.id o professional_profiles.id) según rol.
 *  Lo necesita la suscripción Realtime de la lista de conversaciones. */
export async function getMySubprofileId(role: 'patient' | 'professional'): Promise<string> {
  const table = role === 'patient' ? 'patient_profiles' : 'professional_profiles'
  const { data, error } = await supabase.from(table).select('id').eq('profile_id', (await supabase.auth.getUser()).data.user?.id ?? '').single()
  if (error || !data) throw new Error('No se pudo cargar tu perfil.')
  return String(data.id)
}

/** Conversaciones del usuario (RLS devuelve solo las propias), con datos del
 *  otro participante, no-leídos y vista previa del último mensaje. */
export async function listConversations(myRole: 'patient' | 'professional'): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, last_message_at, created_at, patient_profile_id, professional_profile_id')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) throw new Error(error.message)
  const rows = (data || []) as Record<string, unknown>[]
  if (rows.length === 0) return []

  const otherKey = myRole === 'patient' ? 'professional_profile_id' : 'patient_profile_id'
  const otherTable = myRole === 'patient' ? 'professional_profiles' : 'patient_profiles'
  const otherIds = [...new Set(rows.map((r) => String(r[otherKey])))]

  const { data: others, error: othersError } = await supabase
    .from(otherTable)
    .select('id, profile_id, full_name')
    .in('id', otherIds)

  if (othersError) throw new Error(othersError.message)

  const otherProfileIds = [...new Set((others || []).map((o) => String(o.profile_id)))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', otherProfileIds)

  const avatarById = new Map((profiles || []).map((p) => [String(p.id), p.avatar_url ? String(p.avatar_url) : null]))

  const myUserId = (await supabase.auth.getUser()).data.user?.id ?? ''
  const convIds = rows.map((r) => String(r.id))

  const { data: unread } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', convIds)
    .neq('sender_profile_id', myUserId)
    .is('read_at', null)

  const unreadByConv = new Map<string, number>()
  for (const m of unread || []) {
    const cid = String(m.conversation_id)
    unreadByConv.set(cid, (unreadByConv.get(cid) ?? 0) + 1)
  }

  const { data: lastMessages } = await supabase
    .from('messages')
    .select('conversation_id, content, attachment_path, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })

  const lastByConv = new Map<string, string | null>()
  for (const m of lastMessages || []) {
    const cid = String(m.conversation_id)
    if (!lastByConv.has(cid)) {
      const text = String(m.content ?? '').trim()
      lastByConv.set(cid, text !== '' ? text : '📎 Archivo adjunto')
    }
  }

  const otherById = new Map((others || []).map((o) => [String(o.id), o]))

  return rows.map((r) => {
    const other = otherById.get(String(r[otherKey]))
    return {
      id: String(r.id),
      last_message_at: r.last_message_at ? String(r.last_message_at) : null,
      created_at: String(r.created_at),
      other: {
        profile_id: other ? String(other.profile_id) : '',
        full_name: other ? String(other.full_name) : 'Usuario',
        avatar_url: other ? avatarById.get(String(other.profile_id)) ?? null : null,
      },
      unread_count: unreadByConv.get(String(r.id)) ?? 0,
      last_message: lastByConv.get(String(r.id)) ?? null,
    }
  })
}

/** Mensajes de una conversación, del más reciente al más antiguo (paginado). */
export async function listMessages(conversationId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(mapMessage)
}

/** profiles.id del dueño de un subperfil (para abrir chat con él). */
export async function getProfileIdBySubprofile(
  subprofileId: string,
  role: 'patient' | 'professional'
): Promise<string> {
  const table = role === 'patient' ? 'patient_profiles' : 'professional_profiles'
  const { data, error } = await supabase.from(table).select('profile_id').eq('id', subprofileId).single()
  if (error || !data) throw new Error('No se pudo identificar al usuario.')
  return String(data.profile_id)
}

/** Abre (o crea) la conversación con el contrario. Requiere cita previa. */
export async function startConversation(counterpartyProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', {
    p_counterparty_profile_id: counterpartyProfileId,
  })
  if (error) throw new Error(error.message)
  return String(data)
}

/** Sube un adjunto al bucket privado. El path empieza con el UUID de la
 *  conversación (así la política RLS valida al participante). */
export async function uploadAttachment(conversationId: string, file: File): Promise<ChatAttachment> {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error('Solo se permiten imágenes y archivos PDF.')
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('El archivo supera el límite de 10 MB.')
  }

  const safeName = file.name.replace(/[^\w.\-() áéíóúÁÉÍÓÚñÑ]/g, '_').slice(-120)
  const path = `${conversationId}/${crypto.randomUUID()}-${safeName}`

  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) throw new Error(error.message)

  return { path, name: file.name, size: file.size, mime: file.type }
}

/** Envía un mensaje (texto y/o adjunto ya subido). Si el envío falla con
 *  adjunto, intenta borrar el archivo para no dejar huérfanos. */
export async function sendMessage(
  conversationId: string,
  content: string,
  attachment: ChatAttachment | null
): Promise<void> {
  const { error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_content: content,
    p_attachment_path: attachment?.path ?? null,
    p_attachment_name: attachment?.name ?? null,
    p_attachment_size: attachment?.size ?? null,
    p_attachment_mime: attachment?.mime ?? null,
  })

  if (error) {
    if (attachment) {
      await supabase.storage.from(CHAT_BUCKET).remove([attachment.path])
    }
    throw new Error(error.message)
  }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  })
  if (error) throw new Error(error.message)
}

/** URL firmada de un adjunto (1 h, con cache por path). */
const signedUrlCache = new Map<string, { url: string; expires: number }>()

export async function getAttachmentUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path)
  if (cached && cached.expires > Date.now() + 60_000) return cached.url

  const { data, error } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data) throw new Error('No se pudo abrir el archivo.')

  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + SIGNED_URL_TTL * 1000 })
  return data.signedUrl
}

/** Suscripción Realtime a los cambios de UNA conversación (last_message_at).
 *  Al llegar el evento, el componente refetchea los mensajes por REST (RLS). */
export function subscribeToConversation(
  conversationId: string,
  callback: () => void
): () => void {
  const suffix = Math.random().toString(36).slice(2, 8)
  const channel = supabase
    .channel(`conversation:${conversationId}:${suffix}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
      callback
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
    supabase.removeChannel(channel)
  }
}

/** Suscripción Realtime a la lista de conversaciones del usuario (filtrada por
 *  su subperfil: sin filtro recibiría metadatos de conversaciones ajenas). */
export function subscribeToConversations(
  myRole: 'patient' | 'professional',
  mySubprofileId: string,
  callback: () => void
): () => void {
  const column = myRole === 'patient' ? 'patient_profile_id' : 'professional_profile_id'
  const suffix = Math.random().toString(36).slice(2, 8)
  const channel = supabase
    .channel(`conversations:${column}:${mySubprofileId}:${suffix}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations', filter: `${column}=eq.${mySubprofileId}` },
      callback
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
    supabase.removeChannel(channel)
  }
}

// ---------------------------------------------------------------------------
// Admin (supervisión silenciosa)
// ---------------------------------------------------------------------------

export type AdminConversation = {
  id: string
  last_message_at: string | null
  patient_name: string
  professional_name: string
  message_count: number
}

export async function adminListConversations(): Promise<AdminConversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, last_message_at, patient_profile_id, professional_profile_id')
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(error.message)

  const rows = (data || []) as Record<string, unknown>[]
  if (rows.length === 0) return []

  const patientIds = rows.map((r) => String(r.patient_profile_id))
  const profIds = rows.map((r) => String(r.professional_profile_id))

  const [{ data: patients }, { data: professionals }] = await Promise.all([
    supabase.from('patient_profiles').select('id, full_name').in('id', patientIds),
    supabase.from('professional_profiles').select('id, full_name').in('id', profIds),
  ])

  const { data: counts } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', rows.map((r) => String(r.id)))

  const countByConv = new Map<string, number>()
  for (const c of counts || []) {
    const cid = String(c.conversation_id)
    countByConv.set(cid, (countByConv.get(cid) ?? 0) + 1)
  }

  const patientName = new Map((patients || []).map((p) => [String(p.id), String(p.full_name)]))
  const profName = new Map((professionals || []).map((p) => [String(p.id), String(p.full_name)]))

  return rows.map((r) => ({
    id: String(r.id),
    last_message_at: r.last_message_at ? String(r.last_message_at) : null,
    patient_name: patientName.get(String(r.patient_profile_id)) ?? '—',
    professional_name: profName.get(String(r.professional_profile_id)) ?? '—',
    message_count: countByConv.get(String(r.id)) ?? 0,
  }))
}

export async function moderateMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('moderate_message', { p_message_id: messageId })
  if (error) throw new Error(error.message)
}
