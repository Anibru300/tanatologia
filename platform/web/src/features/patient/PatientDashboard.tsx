import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
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
import {
  getPatientProfileId,
  getAppointmentsForPatient,
  type Appointment,
} from '@/features/appointments/appointmentsService'

export function PatientDashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        const patientProfileId = await getPatientProfileId(userId)
        if (!patientProfileId) return
        const data = await getAppointmentsForPatient(patientProfileId)
        if (!cancelled) setAppointments(data)
      } catch (err) {
        console.error('Error cargando próxima cita:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const now = new Date()
  const nextAppointment = appointments
    .filter((a) => a.status === 'confirmed' && new Date(a.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  const completedAppointments = appointments.filter((a) => a.status === 'completed')
  const completedCount = completedAppointments.length

  // Programa activo: se deduce del tipo de sesión de la última cita de programa
  const lastProgram = [...appointments]
    .filter((a) => a.session_type === 'program_4' || a.session_type === 'program_6')
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0]
  const programTarget = lastProgram?.session_type === 'program_4' ? 4 : lastProgram?.session_type === 'program_6' ? 6 : 0
  const programCompleted = lastProgram
    ? completedAppointments.filter((a) => a.session_type === lastProgram.session_type).length
    : 0

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
              {loading ? (
                <p className="text-text-light text-sm">Cargando...</p>
              ) : nextAppointment ? (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-primary/10 rounded-[12px] p-3 text-center min-w-[60px]">
                      <span className="block text-xs text-primary-dark font-semibold uppercase">
                        {new Date(nextAppointment.scheduled_at).toLocaleString('es-MX', { month: 'short' })}
                      </span>
                      <span className="block text-2xl font-bold text-text">
                        {new Date(nextAppointment.scheduled_at).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-text">{nextAppointment.professionalName}</p>
                      <p className="text-sm text-text-light flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(nextAppointment.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })} hrs · {nextAppointment.duration_minutes} min
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
              {programTarget > 0 ? (
                <>
                  <p className="text-text font-medium mb-1">
                    Programa de {programTarget} sesiones
                  </p>
                  <p className="text-sm text-text-light mb-3">
                    {programCompleted} de {programTarget} sesiones completadas
                  </p>
                  <ProgressBar value={Math.min(100, (programCompleted / programTarget) * 100)} className="mb-4" />
                </>
              ) : (
                <p className="text-sm text-text-light mb-3">
                  Aún no tienes un programa activo. Puedes agendar una consulta o un programa con tu terapeuta.
                </p>
              )}
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
              <p className="text-3xl font-bold text-text mb-1">{loading ? '…' : completedCount}</p>
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
