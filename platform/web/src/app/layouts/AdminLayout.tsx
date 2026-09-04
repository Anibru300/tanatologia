import { PortalLayout, type PortalMenuItem } from '@/app/layouts/PortalLayout'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  Settings,
  FileText,
  Shield,
  Inbox,
  ShieldCheck,
  Headphones,
  BarChart3,
} from 'lucide-react'

const menuItems: PortalMenuItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/profesionales', icon: Stethoscope, label: 'Profesionales' },
  { to: '/admin/verificacion', icon: ShieldCheck, label: 'Verificación' },
  { to: '/admin/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/admin/citas', icon: Calendar, label: 'Citas' },
  { to: '/admin/configuracion', icon: Settings, label: 'Configuración' },
  { to: '/admin/cms', icon: FileText, label: 'Contenidos', soon: true },
  { to: '/admin/auditoria', icon: Shield, label: 'Auditoría' },
  { to: '/admin/feedback', icon: Inbox, label: 'Feedback' },
  { to: '/admin/analiticas', icon: BarChart3, label: 'Flujo de la página' },
  { to: '/admin/soporte', icon: Headphones, label: 'Soporte', soon: true },
]

export function AdminLayout() {
  return <PortalLayout menuItems={menuItems} basePath="/admin" roleLabel="Administrador" />
}
