import { supabase } from '@/lib/supabase'

export type Notification = {
  id: string
  profile_id: string
  type: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    type: String(row.type),
    title: String(row.title),
    body: row.body ? String(row.body) : '',
    link: row.link ? String(row.link) : null,
    read_at: row.read_at ? String(row.read_at) : null,
    created_at: String(row.created_at),
  }
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row) => mapNotification(row as Record<string, unknown>))
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) {
    throw new Error(error.message)
  }

  return count || 0
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)

  if (error) {
    throw new Error(error.message)
  }
}

export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  if (error) {
    throw new Error(error.message)
  }
}

export function subscribeToNotifications(
  profileId: string,
  callback: (notification: Notification) => void
): () => void {
  const channel = supabase
    .channel(`notifications:${profileId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${profileId}`,
      },
      (payload) => {
        callback(mapNotification(payload.new as Record<string, unknown>))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
