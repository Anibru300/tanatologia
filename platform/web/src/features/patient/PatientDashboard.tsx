import { useAuth } from '@/features/auth/AuthProvider'
import { getAppointmentsForPatient } from '@/features/appointments/mockAppointments'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  Calendar,
  Video,
  FileText,
  Heart,
  MessageCircle,
  Clock,
  ArrowRight,
  Headphones,
  CreditCard,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export function PatientDashboard() {
  const { user } = useAuth()
  const appointments = getAppointmentsForPatient(user?.id || '')
  const nextAppointment = appointments
    .filter((a) => a.status === 'confirmed')
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0]

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Hola, {user?.fullName}</h1>
          <p className="text-text-light">Este es tu espacio seguro para sanar.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Próxima sesión
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-primary/10 rounded-[12px] p-3 text-center min-w-[60px]">
                      <span className="block text-xs text-primary-dark font-semibold uppercase">
                        {new Date(nextAppointment.date + 'T00:00:00').toLocaleString('es-MX', { month: 'short' })}
                      </span>
                      <span className="block text-2xl font-bold text-text">
                        {new Date(nextAppointment.date + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-text">{nextAppointment.professionalName}</p>
                      <p className="text-sm text-text-light flex items-center gap-1">
                        <Clock size={14} />
                        {nextAppointment.time} hrs · {nextAppointment.durationMinutes} min
                      </p>
                      <p className="text-xs text-text-light mt-1">Videollamada privada</p>
                    </div>
                  </div>
                  <Link to={`/paciente/sala/${nextAppointment.id}`}>
                    <Button size="sm" className="w-full gap-1">
                      <Video size={16} />
                      Entrar a la sala
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-text-light text-sm mb-3">No tienes citas confirmadas próximas.</p>
                  <Link to="/paciente/agendar">
                    <Button size="sm" className="w-full">Agendar cita</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart size={20} className="text-secondary" />
                Mi programa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text font-medium mb-1">Programa Salud Mental</p>
              <p className="text-sm text-text-light mb-3">2 de 4 sesiones completadas</p>
              <ProgressBar value={50} className="mb-4" />
              <Link to="/paciente/programas">
                <Button variant="outline" size="sm" className="w-full">
                  Ver avance
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText size={20} className="text-accent" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text mb-1">2</p>
              <p className="text-sm text-text-light mb-4">Sesiones completadas</p>
              <Link to="/paciente/historial">
                <Button variant="ghost" size="sm" className="w-full">
                  Ver historial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>Lo que puedes hacer ahora</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Link to="/paciente/agendar">
                  <Button variant="outline" className="w-full h-28 flex flex-col gap-2">
                    <Calendar size={24} />
                    <span>Agendar</span>
                  </Button>
                </Link>
                <Link to="/paciente/terapeutas">
                  <Button variant="outline" className="w-full h-28 flex flex-col gap-2">
                    <Video size={24} />
                    <span>Terapeutas</span>
                  </Button>
                </Link>
                <Link to="/paciente/mensajes">
                  <Button variant="outline" className="w-full h-28 flex flex-col gap-2">
                    <MessageCircle size={24} />
                    <span>Mensajes</span>
                  </Button>
                </Link>
                <Link to="/paciente/recursos">
                  <Button variant="outline" className="w-full h-28 flex flex-col gap-2">
                    <Headphones size={24} />
                    <span>Recursos</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Estado de cuenta
              </CardTitle>
              <CardDescription>Tus pagos y membresías</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-text-light">Saldo pendiente</span>
                  <span className="font-semibold text-text">$0.00 MXN</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-text-light">Próximo pago</span>
                  <Badge variant="success">Al día</Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-text-light">Método de pago</span>
                  <span className="text-sm text-text-light">No configurado</span>
                </div>
              </div>
              <Link to="/paciente/pagos">
                <Button variant="outline" size="sm" className="w-full mt-4 gap-1">
                  Gestionar pagos
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
