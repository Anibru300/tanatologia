export type ChatAttachment = {
  path: string
  name: string
  size: number
  mime: string
}

export type ChatMessage = {
  id: string
  conversation_id: string
  sender_profile_id: string
  content: string
  attachment: ChatAttachment | null
  deleted_by_moderation: boolean
  read_at: string | null
  created_at: string
}

export type ConversationSummary = {
  id: string
  last_message_at: string | null
  created_at: string
  /** Perfil del otro participante */
  other: {
    profile_id: string
    full_name: string
    avatar_url: string | null
  }
  unread_count: number
  /** Vista previa del último mensaje */
  last_message: string | null
}

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}
