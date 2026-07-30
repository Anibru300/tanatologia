import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
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
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  type Appointment,
} from '@/features/appointments/appointmentsService'
import {
  getMyProfessionalProfile,
  type MyProfessionalProfile,
  type VerificationStatus,
} from '@/features/verification/verificationService'

const VERIFICATION_UI: Record<VerificationStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info'; description: string }> = {
  pending: {
    label: 'Pendiente',
    variant: 'info',
    description: 'Completa tu expediente y envíalo a revisión para aparecer en el directorio.',
  },
  in_review: {
    label: 'En revisión',
    variant: 'warning',
    description: 'Estamos revisando tus documentos. Te avisaremos cuando termine el proceso.',
  },
  verified: {
    label: 'Verificado',
    variant: 'success',
    description: 'Tu perfil está completo y apareces en el directorio de terapeutas.',
  },
  rejected: {
    label: 'Rechazado',
    variant: 'error',
    description: 'Tu expediente fue rechazado. Revisa el motivo en la sección de verificación.',
  },
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function ProfessionalDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<MyProfessionalProfile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        const professionalProfileId = await getProfessionalProfileId(userId)
        if (!professionalProfileId) throw new Error('No se encontró tu perfil profesional.')
        const [profileData, appointmentData] = await Promise.all([
          getMyProfessionalProfile(),
          getAppointmentsForProfessional(professionalProfileId),
        ])
        if (cancelled) return
        setProfile(profileData)
        setAppointments(appointmentData)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar tu panel.')
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
  const confirmedFuture = appointments
    .filter((a) => a.status === 'confirmed' && new Date(a.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  const todayAppointments = confirmedFuture.filter((a) => isSameDay(new Date(a.scheduled_at), now))
  const upcomingAppointments = confirmedFuture.slice(0, 5)
  const activePatients = new Set(appointments.map((a) => a.patient_profile_id)).size

  const verification = VERIFICATION_UI[profile?.verification_status ?? 'pending']
  const rating = profile?.rating ?? 0

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Hola, {user?.fullName}</h1>
          <p className="text-text-light">Gestiona tu práctica y acompaña a tus pacientes.</p>
        </div>

        {error && <Alert variant="error" className="mb-6 p-3 rounded-sm">{error}</Alert>}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Citas hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">{loading ? '…' : todayAppointments.length}</p>
              <p className="text-text-light text-sm">{upcomingAppointments.length} próximas confirmadas</p>
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
              <p className="text-3xl font-bold text-text">{loading ? '…' : activePatients}</p>
              <p className="text-text-light text-sm">Con al menos una cita</p>
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
              <p className="text-3xl font-bold text-text">$0</p>
              <p className="text-text-light text-sm">Los pagos aún no están habilitados</p>
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
              <p className="text-3xl font-bold text-text">{loading ? '…' : rating > 0 ? rating.toFixed(1) : '—'}</p>
              <p className="text-text-light text-sm">{rating > 0 ? 'Promedio de reseñas' : 'Sin reseñas aún'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mi agenda</CardTitle>
                  <CardDescription>Próximas sesiones confirmadas</CardDescription>
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
                <div className="text-center py-4">
                  <p className="text-text-light text-sm mb-3">No tienes citas confirmadas próximas.</p>
                  <Link to="/profesional/disponibilidad">
                    <Button size="sm" variant="outline">Publicar horarios</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 bg-bg-alt rounded-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 rounded-sm p-3 text-center min-w-[60px]">
                          <span className="block text-xs text-primary-dark font-semibold uppercase">
                            {new Date(a.scheduled_at).toLocaleString('es-MX', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="block text-lg font-bold text-text">
                            {new Date(a.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
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
                <Badge variant={verification.variant} className="gap-1">
                  {profile?.verification_status === 'verified' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {verification.label}
                </Badge>
                <p className="text-text-light text-sm">{verification.description}</p>
              </div>
              {profile?.verification_status !== 'verified' && (
                <Link to="/profesional/verificacion">
                  <Button variant="outline" size="sm" className="mt-4 gap-1">
                    Ir a verificación
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
