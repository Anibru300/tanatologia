import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Search, Users } from 'lucide-react'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  type Appointment,
} from '@/features/appointments/appointmentsService'

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

export function ProfessionalPatients() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        const professionalProfileId = await getProfessionalProfileId(userId)
        if (!professionalProfileId) return
        const appointments = await getAppointmentsForProfessional(professionalProfileId)
        if (!cancelled) setPatients(buildPatientRows(appointments))
      } catch (err) {
        console.error('Error cargando pacientes:', err)
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

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-text-light p-6">Cargando pacientes...</p>
            ) : filtered.length === 0 ? (
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="py-4 px-4">
                          <p className="font-medium text-text">{p.name}</p>
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
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              p.active ? 'bg-success/10 text-success' : 'bg-muted/20 text-text-light'
                            }`}
                          >
                            {p.active ? 'Activo' : 'Sin cita próxima'}
                          </span>
                        </td>
                      </tr>
                    ))}
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
