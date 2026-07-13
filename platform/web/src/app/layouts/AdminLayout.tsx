import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileQuestion,
  DollarSign,
  CreditCard,
  BarChart3,
  Settings,
  FileText,
  Shield,
  Headphones,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { QuickExitButton } from '@/components/QuickExitButton'

const menuItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/profesionales', icon: Users, label: 'Profesionales' },
  { to: '/admin/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/admin/citas', icon: Calendar, label: 'Citas' },
  { to: '/admin/cotizaciones', icon: FileQuestion, label: 'Cotizaciones' },
  { to: '/admin/finanzas', icon: DollarSign, label: 'Finanzas' },
  { to: '/admin/pagos', icon: CreditCard, label: 'Pagos a profesionales' },
  { to: '/admin/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/configuracion', icon: Settings, label: 'Configuración' },
  { to: '/admin/cms', icon: FileText, label: 'Contenidos' },
  { to: '/admin/auditoria', icon: Shield, label: 'Auditoría' },
  { to: '/admin/soporte', icon: Headphones, label: 'Soporte' },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-72 flex-col bg-surface border-r border-border sticky top-0 h-screen">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              SC
            </div>
            <span className="text-lg font-semibold text-text">SOMOS-CALMA</span>
          </Link>
          <p className="text-xs text-text-light mt-2 uppercase tracking-wider font-semibold">Administración</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-[12px] font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-light hover:bg-bg-alt hover:text-text'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-4 px-4">
            <p className="font-medium text-text text-sm">{user?.fullName}</p>
            <p className="text-xs text-text-light">Administrador</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border">
        <div className="flex items-center justify-between p-4">
          <span className="font-semibold text-text">Admin</span>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="p-4 border-t border-border space-y-1 max-h-[80vh] overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[12px] font-medium ${
                    isActive ? 'bg-primary text-white' : 'text-text-light'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              )
            })}
            <Button variant="ghost" className="w-full justify-start gap-2 mt-4" onClick={handleLogout}>
              <LogOut size={18} />
              Cerrar sesión
            </Button>
          </nav>
        )}
      </div>

      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <Outlet />
      </main>

      <QuickExitButton />
    </div>
  )
}
