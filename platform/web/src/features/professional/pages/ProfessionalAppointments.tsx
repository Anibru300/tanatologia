import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Video, CalendarDays, CheckCircle, XCircle, Star, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  updateAppointmentStatus,
  type Appointment,
} from '@/features/appointments/appointmentsService'
import { RatingDialog } from '@/features/reviews/RatingDialog'
import { getProfileIdBySubprofile } from '@/features/messages/messagesService'
import {
  getRatedAppointmentIdsForProfessional,
  submitPatientReview,
} from '@/features/reviews/reviewsService'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

export function ProfessionalAppointments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null)
  const [acting, setActing] = useState(false)
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [professionalProfileId, setProfessionalProfileId] = useState<string | null>(null)
  const [ratedIds, setRatedIds] = useState<string[]>([])
  const [ratingTarget, setRatingTarget] = useState<Appointment | null>(null)
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null)

  async function openChat(patientProfileId: string) {
    setOpeningChatFor(patientProfileId)
    setActionError('')
    try {
      const userId = await getProfileIdBySubprofile(patientProfileId, 'patient')
      navigate(`/profesional/mensajes?with=${encodeURIComponent(userId)}`)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo abrir el chat.')
      setOpeningChatFor(null)
    }
  }

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const professionalProfileId = await getProfessionalProfileId(userId)
        if (!professionalProfileId) {
          throw new Error('No se encontró tu perfil profesional.')
        }
        if (!cancelled) setProfessionalProfileId(professionalProfileId)
        const data = await getAppointmentsForProfessional(professionalProfileId)
        if (!cancelled) setAppointments(data)
        const rated = await getRatedAppointmentIdsForProfessional(professionalProfileId)
        if (!cancelled) setRatedIds(rated)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando citas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const now = new Date()
  const filtered = appointments.filter((a) => {
    const date = new Date(a.scheduled_at)
    if (tab === 'upcoming') return date >= now && (a.status === 'confirmed' || a.status === 'pending')
    if (tab === 'past') return date < now || a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show'
    return true
  })

  const TABS = [
    { key: 'upcoming' as const, label: 'Próximas' },
    { key: 'past' as const, label: 'Pasadas' },
    { key: 'all' as const, label: 'Todas' },
  ]

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    try {
      setActing(true)
      setActionError('')
      await updateAppointmentStatus(id, status)
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error actualizando cita')
    } finally {
      setActing(false)
      setConfirmCancel(null)
    }
  }

  const handleRatePatient = async (rating: number, comment: string | null) => {
    if (!ratingTarget || !professionalProfileId) return
    await submitPatientReview({
      patient_profile_id: ratingTarget.patient_profile_id,
      professional_profile_id: professionalProfileId,
      appointment_id: ratingTarget.id,
      rating,
      comment,
    })
    setRatedIds((prev) => [...prev, ratingTarget.id])
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Mis citas</h1>
            <p className="text-text-light">Gestiona tu agenda de pacientes.</p>
          </div>
          <Link to="/profesional/agenda">
            <Button variant="outline" className="mt-4 md:mt-0 gap-2">
              <CalendarDays size={18} />
              Ver calendario
            </Button>
          </Link>
        </div>

        {loading && <p className="text-text-light mb-4">Cargando citas...</p>}
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {actionError && <Alert variant="error" className="mb-4">{actionError}</Alert>}
        {!loading && !error && appointments.length === 0 && (
          <p className="text-text-light mb-4">No tienes citas registradas.</p>
        )}
        {!loading && !error && appointments.length > 0 && filtered.length === 0 && (
          <p className="text-text-light mb-4">No hay citas en esta categoría.</p>
        )}

        <div className="flex gap-2 mb-4" role="tablist" aria-label="Filtrar citas">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-primary-dark text-white'
                  : 'bg-bg-alt text-text-light hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{TABS.find((t) => t.key === tab)?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Paciente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text font-medium">{a.patientName}</td>
                      <td className="py-4 px-4 text-text">{formatDate(a.scheduled_at)}</td>
                      <td className="py-4 px-4 text-text-light">{formatTime(a.scheduled_at)}</td>
                      <td className="py-4 px-4 text-text-light">{a.serviceName}</td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={
                            a.status === 'confirmed'
                              ? 'success'
                              : a.status === 'completed'
                                ? 'info'
                                : a.status === 'cancelled' || a.status === 'no_show'
                                  ? 'error'
                                  : 'warning'
                          }
                        >
                          {STATUS_LABELS[a.status] || a.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            title="Enviar mensaje al paciente"
                            disabled={openingChatFor === a.patient_profile_id}
                            onClick={() => openChat(a.patient_profile_id)}
                          >
                            <MessageSquare size={14} />
                            Mensaje
                          </Button>
                          {a.video_link && (
                            <Link to={`/profesional/sala/${a.id}`}>
                              <Button size="sm" variant="primary" className="gap-1">
                                <Video size={16} />
                                Entrar
                              </Button>
                            </Link>
                          )}
                          {(a.status === 'confirmed' || a.status === 'pending') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Marcar cita con ${a.patientName} como completada`}
                                title="Marcar como completada"
                                disabled={acting}
                                onClick={() => handleStatusChange(a.id, 'completed')}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-error-dark"
                                aria-label={`Cancelar cita con ${a.patientName}`}
                                title="Cancelar cita"
                                disabled={acting}
                                onClick={() => setConfirmCancel(a)}
                              >
                                <XCircle size={16} />
                              </Button>
                            </>
                          )}
                          {a.status === 'completed' && !ratedIds.includes(a.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              title="Calificar paciente"
                              onClick={() => setRatingTarget(a)}
                            >
                              <Star size={14} />
                              Calificar
                            </Button>
                          )}
                          {a.status === 'completed' && ratedIds.includes(a.id) && (
                            <span className="flex items-center gap-1 text-sm text-success-dark" title="Paciente calificado">
                              <Star size={14} className="fill-warning text-warning" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <RatingDialog
          open={ratingTarget !== null}
          onClose={() => setRatingTarget(null)}
          title={`Calificar a ${ratingTarget?.patientName || ''}`}
          description="Tu calificación es privada: solo la ven otros profesionales que atiendan a este paciente y el equipo de SOMOS-CALMA."
          onSubmit={handleRatePatient}
        />

        <ConfirmDialog
          open={confirmCancel !== null}
          title="Cancelar cita"
          destructive
          loading={acting}
          message={
            confirmCancel
              ? `¿Cancelar la cita con ${confirmCancel.patientName} del ${formatDate(confirmCancel.scheduled_at)} a las ${formatTime(confirmCancel.scheduled_at)} hrs? El paciente recibirá una notificación.`
              : ''
          }
          confirmLabel="Sí, cancelar cita"
          onConfirm={() => confirmCancel && handleStatusChange(confirmCancel.id, 'cancelled')}
          onCancel={() => setConfirmCancel(null)}
        />
      </div>
    </div>
  )
}
