import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { QuickExitButton } from '@/components/QuickExitButton'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { APP_VERSION } from '@/lib/version'
import { InstallAppButton } from '@/components/InstallAppButton'

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
  /** Accesos directos de la barra de navegación inferior móvil (máx. 4). */
  quickNav?: PortalMenuItem[]
  /** Ruta base del portal (p.ej. '/paciente'); coincide solo de forma exacta. */
  basePath: string
  roleLabel: string
  /** El botón de salida rápida es una medida de seguridad pensada para pacientes. */
  showQuickExit?: boolean
}

/** Layout unificado de los 3 portales (sidebar + header móvil + campana). */
export function PortalLayout({ menuItems, quickNav = [], basePath, roleLabel, showQuickExit = false }: PortalLayoutProps) {
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

  // Menú móvil: cerrar con Escape y bloquear el scroll de fondo mientras está abierto
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

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
          <div className="mb-2">
            <InstallAppButton />
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </Button>
          <p className="mt-3 px-4 text-[11px] text-text-light">v{APP_VERSION}</p>
        </div>
      </aside>

      {/* Mobile header: hamburguesa a la izquierda + marca + campana */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-surface border-b border-border">
        <div className="flex items-center gap-1 p-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
          >
            <Menu size={24} />
          </button>
          <span className="flex-1 font-semibold text-text truncate">
            {activeItem?.label ?? 'SOMOS-CALMA'}
          </span>
          <NotificationBell />
        </div>
      </div>

      {/* Overlay del drawer móvil */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-text/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer móvil (lado izquierdo), espejo del sidebar de escritorio */}
      <div
        id="mobile-drawer"
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to={basePath} onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
            <Logo />
            <span className="font-semibold text-text">SOMOS-CALMA</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-2 -mr-2"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <nav
          className="flex-1 overflow-y-auto p-4 space-y-1"
          aria-label={`Menú de ${roleLabel.toLowerCase()}`}
        >
          {menuItems.map((item) => renderItem(item, () => setMobileOpen(false)))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="mb-3 px-4">
            <p className="font-medium text-text text-sm">{user?.fullName}</p>
            <p className="text-xs text-text-light">{roleLabel}</p>
          </div>
          <div className="mb-2">
            <InstallAppButton />
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </Button>
          <p className="mt-3 px-4 text-[11px] text-text-light">v{APP_VERSION}</p>
        </div>
      </div>

      {/* Main content */}
      <main className={`flex-1 lg:ml-0 pt-16 lg:pt-0 leading-normal ${quickNav.length > 0 ? 'pb-24 lg:pb-0' : ''}`}>
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

      {/* Barra de navegación inferior móvil: accesos directos + botón Menú */}
      {quickNav.length > 0 && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border"
          aria-label="Accesos rápidos"
        >
          <div className="grid grid-cols-5">
            {quickNav.slice(0, 4).map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                    active ? 'text-primary-dark' : 'text-text-light hover:text-text'
                  }`}
                >
                  <item.icon size={22} aria-hidden />
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-text-light hover:text-text"
              aria-label="Abrir menú completo"
            >
              <Menu size={22} aria-hidden />
              <span>Menú</span>
            </button>
          </div>
        </nav>
      )}

      {showQuickExit && <QuickExitButton />}
    </div>
  )
}
