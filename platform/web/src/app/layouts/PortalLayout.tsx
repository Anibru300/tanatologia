import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { QuickExitButton } from '@/components/QuickExitButton'
import { NotificationBell } from '@/features/notifications/NotificationBell'

export interface PortalMenuItem {
  to: string
  icon: LucideIcon
  label: string
  /** Muestra un badge "Pronto" (secciones ComingSoon). */
  soon?: boolean
  /** Rutas adicionales que activan este ítem (p.ej. '/profesional/sala'). */
  matchPaths?: string[]
}

interface PortalLayoutProps {
  menuItems: PortalMenuItem[]
  /** Ruta base del portal (p.ej. '/paciente'); coincide solo de forma exacta. */
  basePath: string
  roleLabel: string
  /** El botón de salida rápida es una medida de seguridad pensada para pacientes. */
  showQuickExit?: boolean
}

/** Layout unificado de los 3 portales (sidebar + header móvil + campana). */
export function PortalLayout({ menuItems, basePath, roleLabel, showQuickExit = false }: PortalLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (item: PortalMenuItem) => {
    if (item.to === basePath) return location.pathname === basePath
    if (location.pathname.startsWith(item.to)) return true
    return item.matchPaths?.some((p) => location.pathname.startsWith(p)) ?? false
  }

  const activeItem = menuItems.find((item) => isActive(item))

  const linkClasses = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-sm font-medium transition-colors ${
      active ? 'bg-primary-dark text-white' : 'text-text-light hover:bg-bg-alt hover:text-text'
    }`

  const renderItem = (item: PortalMenuItem, onNavigate?: () => void) => (
    <Link key={item.to} to={item.to} onClick={onNavigate} className={linkClasses(isActive(item))}>
      <item.icon size={20} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-dark">
          Pronto
        </span>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 flex-col bg-surface border-r border-border sticky top-0 h-screen">
        <div className="p-6 border-b border-border">
          <Link to={basePath} className="flex items-center gap-3">
            <Logo />
            <span className="text-lg font-semibold text-text">SOMOS-CALMA</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label={`Menú de ${roleLabel.toLowerCase()}`}>
          {menuItems.map((item) => renderItem(item))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-4 px-4">
            <p className="font-medium text-text text-sm">{user?.fullName}</p>
            <p className="text-xs text-text-light">{roleLabel}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border">
        <div className="flex items-center justify-between p-4">
          <span className="font-semibold text-text">SOMOS-CALMA</span>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 top-[65px] bg-text/30 z-40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <nav
              className="relative z-50 bg-surface p-4 border-t border-border space-y-1 max-h-[80vh] overflow-y-auto"
              aria-label={`Menú de ${roleLabel.toLowerCase()}`}
            >
              <div className="px-4 pb-2 mb-2 border-b border-border">
                <p className="font-medium text-text text-sm">{user?.fullName}</p>
                <p className="text-xs text-text-light">{roleLabel}</p>
              </div>
              {menuItems.map((item) => renderItem(item, () => setMobileOpen(false)))}
              <Button variant="ghost" className="w-full justify-start gap-2 mt-4" onClick={handleLogout}>
                <LogOut size={18} />
                Cerrar sesión
              </Button>
            </nav>
          </>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0 leading-normal">
        {/* Barra superior de escritorio: sección actual + notificaciones */}
        <div className="hidden lg:flex items-center justify-between px-6 py-2 border-b border-border bg-surface sticky top-0 z-40">
          <p className="text-sm text-text-light">
            {roleLabel}
            {activeItem && (
              <>
                <span className="mx-2 text-border">/</span>
                <span className="text-text font-medium">{activeItem.label}</span>
              </>
            )}
          </p>
          <NotificationBell />
        </div>
        <Outlet />
      </main>

      {showQuickExit && <QuickExitButton />}
    </div>
  )
}
