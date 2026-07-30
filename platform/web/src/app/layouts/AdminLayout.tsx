import { PortalLayout, type PortalMenuItem } from '@/app/layouts/PortalLayout'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  FileQuestion,
  DollarSign,
  CreditCard,
  BarChart3,
  Settings,
  FileText,
  Shield,
  ShieldCheck,
  Headphones,
} from 'lucide-react'

const menuItems: PortalMenuItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/profesionales', icon: Stethoscope, label: 'Profesionales' },
  { to: '/admin/verificacion', icon: ShieldCheck, label: 'Verificación' },
  { to: '/admin/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/admin/citas', icon: Calendar, label: 'Citas' },
  { to: '/admin/cotizaciones', icon: FileQuestion, label: 'Cotizaciones' },
  { to: '/admin/finanzas', icon: DollarSign, label: 'Finanzas', soon: true },
  { to: '/admin/pagos', icon: CreditCard, label: 'Pagos a profesionales', soon: true },
  { to: '/admin/reportes', icon: BarChart3, label: 'Reportes', soon: true },
  { to: '/admin/configuracion', icon: Settings, label: 'Configuración', soon: true },
  { to: '/admin/cms', icon: FileText, label: 'Contenidos', soon: true },
  { to: '/admin/auditoria', icon: Shield, label: 'Auditoría' },
  { to: '/admin/soporte', icon: Headphones, label: 'Soporte' },
]

export function AdminLayout() {
  return <PortalLayout menuItems={menuItems} basePath="/admin" roleLabel="Administrador" />
}
