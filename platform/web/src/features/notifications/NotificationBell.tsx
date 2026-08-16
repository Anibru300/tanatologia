import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  Notification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from './notificationsService'

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`

  return new Date(isoDate).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const userId = user?.id ?? null

  const loadNotifications = () => {
    setLoadError(false)
    return Promise.all([getNotifications(), getUnreadCount()])
      .then(([items, count]) => {
        setNotifications(items)
        setUnreadCount(count)
      })
      .catch((err) => {
        console.error('Error cargando notificaciones:', err)
        setLoadError(true)
      })
  }

  useEffect(() => {
    if (!userId) return

    let mounted = true

    Promise.all([getNotifications(), getUnreadCount()])
      .then(([items, count]) => {
        if (!mounted) return
        setNotifications(items)
        setUnreadCount(count)
      })
      .catch((err) => {
        console.error('Error cargando notificaciones:', err)
        if (mounted) setLoadError(true)
      })

    const unsubscribe = subscribeToNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20))
      if (!notification.read_at) {
        setUnreadCount((prev) => prev + 1)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [userId])

  // Cerrar el panel al hacer click fuera
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (!user) return null

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      markAsRead(notification.id).catch((err) =>
        console.error('Error marcando notificación como leída:', err)
      )
    }

    setOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const handleMarkAllAsRead = async () => {
    const now = new Date().toISOString()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })))
    setUnreadCount(0)
    markAllAsRead().catch((err) =>
      console.error('Error marcando todas como leídas:', err)
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-sm text-text-light hover:bg-bg-alt hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/60"
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error-dark text-white text-[11px] font-semibold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-sm shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-text text-sm">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-primary-dark hover:underline"
              >
                <CheckCheck size={14} />
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loadError ? (
              <div className="px-4 py-6 text-center space-y-3">
                <p className="text-sm text-text-light">
                  No pudimos cargar tus notificaciones.
                </p>
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="text-sm font-medium text-primary-dark hover:underline"
                >
                  Reintentar
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-light text-center">
                No tienes notificaciones
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-alt transition-colors ${
                    notification.read_at ? '' : 'bg-bg-alt/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        notification.read_at ? 'invisible' : 'bg-primary'
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{notification.title}</p>
                      {notification.body && (
                        <p className="text-xs text-text-light mt-0.5">{notification.body}</p>
                      )}
                      <p className="text-xs text-text-light mt-1">
                        {relativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
