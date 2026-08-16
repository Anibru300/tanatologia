import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { QuickExitButton } from '@/components/QuickExitButton'
import { Logo } from '@/components/ui/Logo'
import { siteConfig } from '@/lib/siteConfig'
import { Menu, X, User } from 'lucide-react'
import { useState } from 'react'

export function RootLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { to: '/cotizacion', label: 'Cotización' },
    ...(user?.role === 'patient' ? [{ to: '/paciente', label: 'Mi espacio' }] : []),
    ...(user?.role === 'professional' ? [{ to: '/profesional', label: 'Portal profesional' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Administración' }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="container-calma">
          <nav className="flex items-center justify-between h-20">
            <a href={siteConfig.urls.legacy} className="flex items-center gap-3">
              <Logo size="md" />
              <span className="text-xl font-semibold text-text">SOMOS-CALMA</span>
            </a>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-text-light hover:text-primary-dark font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-text-light flex items-center gap-2">
                    <User size={16} />
                    {user.fullName}
                  </span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Iniciar sesión</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Registrarme</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-text"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </nav>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface border-b border-border">
            <div className="container-calma py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-text-light hover:text-primary font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <Button variant="ghost" size="sm" onClick={logout}>
                  Cerrar sesión
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">Iniciar sesión</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Registrarme</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {!isAuthPage && <QuickExitButton />}

      <footer className="bg-primary-dark text-white py-12">
        <div className="container-calma">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">SOMOS-CALMA</h3>
              <p className="text-white/80 text-sm">
                Tu espacio seguro para sanar y encontrar alivio.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Enlaces</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href={siteConfig.urls.legacy} className="hover:text-white">Inicio</a></li>
                <li><Link to="/cotizacion" className="hover:text-white">Cotización</Link></li>
                <li><Link to="/login" className="hover:text-white">Iniciar sesión</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="/pages/aviso-privacidad.html" className="hover:text-white">Aviso de privacidad</a></li>
                <li><a href="/pages/terminos.html" className="hover:text-white">Términos y condiciones</a></li>
                <li><a href="/pages/cancelacion.html" className="hover:text-white">Cancelación y reembolsos</a></li>
                <li><a href="/pages/crisis.html" className="hover:text-white">Líneas de emergencia</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contacto</h4>
              <p className="text-sm text-white/80">{siteConfig.contact.hello}</p>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/60">
            © {new Date().getFullYear()} SOMOS-CALMA. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
