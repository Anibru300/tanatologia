import { PortalLayout, type PortalMenuItem } from '@/app/layouts/PortalLayout'
import {
  LayoutDashboard,
  User,
  CheckCircle,
  CalendarDays,
  Clock,
  Users,
  ClipboardList,
  Video,
  FileText,
  MessageSquare,
  MessageSquarePlus,
  BookOpen,
  GraduationCap,
  Settings,
  HelpCircle,
} from 'lucide-react'

const menuItems: PortalMenuItem[] = [
  { to: '/profesional', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profesional/perfil', icon: User, label: 'Mi perfil' },
  { to: '/profesional/verificacion', icon: CheckCircle, label: 'Verificación' },
  { to: '/profesional/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/profesional/disponibilidad', icon: Clock, label: 'Disponibilidad' },
  { to: '/profesional/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/profesional/citas', icon: ClipboardList, label: 'Citas' },
  { to: '/profesional/videollamada', icon: Video, label: 'Videollamada', matchPaths: ['/profesional/sala'] },
  { to: '/profesional/notas', icon: FileText, label: 'Notas clínicas' },
  { to: '/profesional/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { to: '/profesional/feedback', icon: MessageSquarePlus, label: 'Feedback' },
  { to: '/profesional/recursos', icon: BookOpen, label: 'Recursos', soon: true },
  { to: '/profesional/tutoriales', icon: GraduationCap, label: 'Tutoriales' },
  { to: '/profesional/configuracion', icon: Settings, label: 'Configuración' },
  { to: '/profesional/ayuda', icon: HelpCircle, label: 'Ayuda' },
]

export function ProfessionalLayout() {
  return <PortalLayout menuItems={menuItems} basePath="/profesional" roleLabel="Profesional" />
}
