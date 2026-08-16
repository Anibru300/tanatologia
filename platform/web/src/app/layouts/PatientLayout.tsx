import { PortalLayout, type PortalMenuItem } from '@/app/layouts/PortalLayout'
import {
  LayoutDashboard,
  User,
  Search,
  Calendar,
  Clock,
  Heart,
  FileText,
  CreditCard,
  MessageSquare,
  BookOpen,
  FileQuestion,
  HelpCircle,
} from 'lucide-react'

const menuItems: PortalMenuItem[] = [
  { to: '/paciente', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/paciente/perfil', icon: User, label: 'Mi perfil' },
  { to: '/paciente/terapeutas', icon: Search, label: 'Buscar terapeuta' },
  { to: '/paciente/agendar', icon: Calendar, label: 'Agendar cita' },
  { to: '/paciente/citas', icon: Clock, label: 'Mis citas', matchPaths: ['/paciente/sala'] },
  { to: '/paciente/programas', icon: Heart, label: 'Mis programas' },
  { to: '/paciente/historial', icon: FileText, label: 'Historial' },
  { to: '/paciente/pagos', icon: CreditCard, label: 'Pagos', soon: true },
  { to: '/paciente/mensajes', icon: MessageSquare, label: 'Mensajes', soon: true },
  { to: '/paciente/recursos', icon: BookOpen, label: 'Recursos' },
  { to: '/paciente/cotizacion', icon: FileQuestion, label: 'Cotización' },
  { to: '/paciente/ayuda', icon: HelpCircle, label: 'Ayuda' },
]

export function PatientLayout() {
  return <PortalLayout menuItems={menuItems} basePath="/paciente" roleLabel="Paciente" showQuickExit />
}
