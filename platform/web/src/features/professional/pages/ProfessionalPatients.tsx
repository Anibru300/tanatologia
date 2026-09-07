import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { Search, Users, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  type Appointment,
} from '@/features/appointments/appointmentsService'
import { getPatientRatingsForProfessional } from '@/features/reviews/reviewsService'
import { getProfileIdBySubprofile } from '@/features/messages/messagesService'

type PatientRow = {
  id: string
  name: string
  sessions: number
  lastSession: string | null
  active: boolean
}

function buildPatientRows(appointments: Appointment[]): PatientRow[] {
  const now = new Date()
  const byPatient = new Map<string, PatientRow>()

  for (const a of appointments) {
    const existing = byPatient.get(a.patient_profile_id) || {
      id: a.patient_profile_id,
      name: a.patientName,
      sessions: 0,
      lastSession: null as string | null,
      active: false,
    }
    if (a.status === 'completed') {
      existing.sessions += 1
      if (!existing.lastSession || new Date(a.scheduled_at) > new Date(existing.lastSession)) {
        existing.lastSession = a.scheduled_at
      }
    }
    if (a.status === 'confirmed' && new Date(a.scheduled_at) >= now) {
      existing.active = true
    }
    byPatient.set(a.patient_profile_id, existing)
  }

  return [...byPatient.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

export function ProfessionalPatients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Map<string, { rating: number; rating_count: number }>>(new Map())
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null)
  const [chatError, setChatError] = useState('')

  async function openChat(patientProfileId: string) {
    setOpeningChatFor(patientProfileId)
    setChatError('')
    try {
      const userId = await getProfileIdBySubprofile(patientProfileId, 'patient')
      navigate(`/profesional/mensajes?with=${encodeURIComponent(userId)}`)
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'No se pudo abrir el chat.')
      setOpeningChatFor(null)
    }
  }

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        const professionalProfileId = await getProfessionalProfileId(userId)
        if (!professionalProfileId) throw new Error('No se encontró tu perfil profesional.')
        const appointments = await getAppointmentsForProfessional(professionalProfileId)
        if (!cancelled) {
          setAppointments(appointments)
          setPatients(buildPatientRows(appointments))
        }
        try {
          const rows = await getPatientRatingsForProfessional(professionalProfileId)
          if (!cancelled) {
            setRatings(new Map(rows.map((r) => [r.patient_profile_id, r])))
          }
        } catch {
          // La calificación es informativa; si falla no bloqueamos la lista.
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar tus pacientes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return patients
    return patients.filter((p) => p.name.toLowerCase().includes(term))
  }, [patients, search])

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Pacientes</h1>
            <p className="text-text-light">Pacientes con al menos una cita contigo.</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Input
              placeholder="Buscar paciente..."
              icon={<Search size={18} />}
              className="w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && <Alert variant="error" className="mb-4 p-3 rounded-sm">{error}</Alert>}
        {chatError && <Alert variant="error" className="mb-4 p-3 rounded-sm">{chatError}</Alert>}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-text-light p-6">Cargando pacientes...</p>
            ) : error ? null : filtered.length === 0 ? (
              <div className="text-center py-12 text-text-light">
                <Users size={48} className="mx-auto mb-4 text-muted" />
                <p>{patients.length === 0 ? 'Aún no tienes pacientes con citas.' : 'Sin resultados para tu búsqueda.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Nombre</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Sesiones completadas</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Última sesión</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Calificación</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const expanded = expandedId === p.id
                      const history = expanded
                        ? appointments
                            .filter((a) => a.patient_profile_id === p.id)
                            .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
                            .slice(0, 5)
                        : []
                      return (
                        <Fragment key={p.id}>
                          <tr
                            className="border-b border-border last:border-0 hover:bg-bg-alt/50 cursor-pointer"
                            onClick={() => setExpandedId(expanded ? null : p.id)}
                          >
                            <td className="py-4 px-4">
                              <p className="font-medium text-text flex items-center gap-2">
                                {expanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                                {p.name}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-text">{p.sessions}</td>
                            <td className="py-4 px-4 text-text-light">
                              {p.lastSession
                                ? new Date(p.lastSession).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="py-4 px-4">
                              {ratings.has(p.id) ? (
                                <span className="flex items-center gap-1" title="Calificación de colegas (privada)">
                                  <Star size={14} className="fill-warning text-warning" />
                                  <span className="text-text text-sm font-medium">{ratings.get(p.id)!.rating.toFixed(1)}</span>
                                  <span className="text-xs text-text-light">({ratings.get(p.id)!.rating_count})</span>
                                </span>
                              ) : (
                                <span className="text-text-light text-sm">—</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <Badge variant={p.active ? 'success' : 'default'}>
                                {p.active ? 'Activo' : 'Sin cita próxima'}
                              </Badge>
                            </td>
                          </tr>
                          {expanded && (
                            <tr key={`${p.id}-detail`} className="border-b border-border last:border-0 bg-bg-alt/30">
                              <td colSpan={5} className="py-4 px-4">
                                <p className="text-xs font-semibold text-text-light uppercase tracking-wide mb-2">
                                  Últimas citas
                                </p>
                                {history.length === 0 ? (
                                  <p className="text-sm text-text-light">Sin citas registradas.</p>
                                ) : (
                                  <ul className="space-y-1 mb-3">
                                    {history.map((a) => (
                                      <li key={a.id} className="flex items-center gap-3 text-sm">
                                        <span className="text-text">
                                          {new Date(a.scheduled_at).toLocaleDateString('es-MX', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })}
                                        </span>
                                        <span className="text-text-light">{a.serviceName || 'Sesión'}</span>
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
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <Link to="/profesional/notas">
                                    <Button size="sm" variant="outline">
                                      Escribir nota clínica
                                    </Button>
                                  </Link>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={openingChatFor === p.id}
                                    onClick={() => openChat(p.id)}
                                  >
                                    {openingChatFor === p.id ? 'Abriendo…' : 'Enviar mensaje'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
