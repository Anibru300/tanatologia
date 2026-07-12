import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  Star,
  FileText,
  Video,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  type Appointment,
} from '@/features/appointments/appointmentsService'

export function ProfessionalDashboard() {
  const { user } = useAuth()
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        const professionalProfileId = await getProfessionalProfileId(userId)
        if (!professionalProfileId) return
        const appointments = await getAppointmentsForProfessional(professionalProfileId)
        const upcoming = appointments
          .filter((a) => a.status === 'confirmed')
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
          .slice(0, 5)
        if (!cancelled) setUpcomingAppointments(upcoming)
      } catch (err) {
        console.error('Error cargando citas:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Hola, {user?.fullName}</h1>
          <p className="text-text-light">Gestiona tu práctica y acompaña a tus pacientes.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Citas hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">{upcomingAppointments.length}</p>
              <p className="text-text-light text-sm">{upcomingAppointments.length} confirmadas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} className="text-secondary" />
                Pacientes activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">5</p>
              <p className="text-text-light text-sm">Este mes</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign size={20} className="text-accent" />
                Ingresos del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$1,200</p>
              <p className="text-text-light text-sm">Neto después de comisión</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star size={20} className="text-warning" />
                Calificación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">4.9</p>
              <p className="text-text-light text-sm">Basado en 12 reseñas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mi agenda de hoy</CardTitle>
                  <CardDescription>Próximas sesiones y solicitudes</CardDescription>
                </div>
                <Link to="/profesional/agenda">
                  <Button variant="outline" size="sm" className="gap-1">
                    Ver agenda
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-text-light">Cargando citas...</p>
              ) : upcomingAppointments.length === 0 ? (
                <p className="text-text-light">No tienes citas confirmadas próximas.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 bg-bg-alt rounded-[12px]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 rounded-[12px] p-3 text-center min-w-[60px]">
                          <span className="block text-lg font-bold text-text">
                            {new Date(a.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                          <span className="block text-xs text-text-light">hrs</span>
                        </div>
                        <div>
                          <p className="font-medium text-text">{a.patientName}</p>
                          <p className="text-sm text-text-light">{a.serviceName}</p>
                        </div>
                      </div>
                      <Link to={`/profesional/sala/${a.id}`}>
                        <Button size="sm" className="gap-1">
                          <Video size={16} />
                          Entrar
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/profesional/disponibilidad">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Clock size={18} />
                  Configurar horarios
                </Button>
              </Link>
              <Link to="/profesional/notas">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText size={18} />
                  Mis notas clínicas
                </Button>
              </Link>
              <Link to="/profesional/videollamada">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Video size={18} />
                  Sala de videollamada
                </Button>
              </Link>
              <Link to="/profesional/ingresos">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <DollarSign size={18} />
                  Mis ingresos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Estado de verificación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge variant="success" className="gap-1">
                  <CheckCircle size={14} />
                  Verificado
                </Badge>
                <p className="text-text-light text-sm">
                  Tu perfil está completo y apareces en el directorio de terapeutas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
