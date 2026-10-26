import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Calendar, Video } from 'lucide-react'
import {
  getAdminAppointments,
  getAdminProgramAppointments,
  getCallFacts,
  type AdminAppointment,
  type AdminCallFact,
  type AdminProgramAppointment,
} from '@/features/admin/adminService'

const sessionTypeLabels: Record<string, string> = {
  single: 'Consulta aislada',
  program_4: 'Programa 4 sesiones',
  program_6: 'Programa 6 sesiones',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No show',
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
}

export function AdminAppointments() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [programAppointments, setProgramAppointments] = useState<AdminProgramAppointment[]>([])
  const [callFacts, setCallFacts] = useState<Map<string, AdminCallFact>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [data, programRows] = await Promise.all([
        getAdminAppointments(),
        getAdminProgramAppointments(),
      ])
      setAppointments(data)
      setProgramAppointments(programRows)
      setCallFacts(await getCallFacts(data.map((a) => a.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  // Resumen para supervisión: planes con sesiones aún no agendadas.
  const programSummary = useMemo(() => {
    const byPlan = new Map<string, AdminProgramAppointment[]>()
    for (const row of programAppointments) {
      const key = `${row.patient_profile_id}|${row.professional_profile_id}|${row.session_type}`
      const list = byPlan.get(key) || []
      list.push(row)
      byPlan.set(key, list)
    }
    let activePlans = 0
    let pendingSessions = 0
    for (const [key, rows] of byPlan) {
      const total = key.endsWith('program_4') ? 4 : 6
      const remaining = total - rows.length
      if (remaining > 0) {
        activePlans += 1
        pendingSessions += remaining
      }
    }
    return { activePlans, pendingSessions }
  }, [programAppointments])

  // Progreso de cada plan (par paciente+profesional+tipo): posición de la
  // cita en la secuencia, total del plan y cuántas quedan por agendar.
  const programInfoById = useMemo(() => {
    const byPlan = new Map<string, AdminProgramAppointment[]>()
    for (const row of programAppointments) {
      const key = `${row.patient_profile_id}|${row.professional_profile_id}|${row.session_type}`
      const list = byPlan.get(key) || []
      list.push(row)
      byPlan.set(key, list)
    }
    const now = Date.now()
    const map = new Map<string, { total: number; ordinal: number; used: number; upcoming: number }>()
    for (const [key, rows] of byPlan) {
      const total = key.endsWith('program_4') ? 4 : 6
      const used = rows.length
      const upcoming = rows.filter(
        (r) => (r.status === 'pending' || r.status === 'confirmed') && new Date(r.scheduled_at).getTime() > now
      ).length
      rows.forEach((r, i) => map.set(r.id, { total, ordinal: i + 1, used, upcoming }))
    }
    return map
  }, [programAppointments])

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Citas</h1>
          <p className="text-text-light">Supervisión de todas las sesiones agendadas.</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Citas programadas
            </CardTitle>
            <CardDescription>Todas las citas de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            {programSummary.activePlans > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="info">{programSummary.activePlans} plan{programSummary.activePlans === 1 ? '' : 'es'} en curso</Badge>
                <Badge variant="warning">
                  {programSummary.pendingSessions} sesión{programSummary.pendingSessions === 1 ? '' : 'es'} por agendar
                </Badge>
              </div>
            )}
            <DataTable
              loading={loading}
              rows={appointments}
              keyOf={(a) => a.id}
              emptyMessage="No hay citas registradas."
              caption="Todas las citas de la plataforma"
              columns={[
                { header: 'Paciente', render: (a) => <span className="text-text">{a.patient_name}</span> },
                { header: 'Profesional', render: (a) => <span className="text-text">{a.professional_name}</span> },
                {
                  header: 'Fecha y hora',
                  render: (a) => {
                    const date = new Date(a.scheduled_at)
                    return (
                      <span className="text-text-light">
                        {date.toLocaleDateString('es-MX')}{' '}
                        {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )
                  },
                },
                {
                  header: 'Tipo',
                  render: (a) => {
                    const info = programInfoById.get(a.id)
                    if (!info) {
                      return <span className="text-text-light">{sessionTypeLabels[a.session_type] || a.session_type}</span>
                    }
                    const remaining = info.total - info.used
                    const pending = remaining - info.upcoming
                    const followup =
                      remaining <= 0
                        ? 'plan completo'
                        : info.upcoming === 0
                          ? `faltan ${remaining} sin agendar`
                          : info.upcoming === remaining
                            ? `quedan ${remaining}, todas con fecha`
                            : `quedan ${remaining}: ${info.upcoming} con fecha, ${pending} sin agendar`
                    return (
                      <div>
                        <span className="text-text-light">{sessionTypeLabels[a.session_type] || a.session_type}</span>
                        <p className="text-xs text-text-light mt-0.5">
                          <span className="font-medium text-text">Sesión {info.ordinal} de {info.total}</span>
                          {' · '}
                          {followup}
                        </p>
                      </div>
                    )
                  },
                },
                {
                  header: 'Videollamada',
                  render: (a) => {
                    const fact = callFacts.get(a.id)
                    if (!fact) {
                      return (
                        <span className="text-text-light text-xs inline-flex items-center gap-1">
                          <Video size={14} /> Sin datos
                        </span>
                      )
                    }
                    const label = `${fact.participants} participante${fact.participants === 1 ? '' : 's'}` +
                      (fact.duration_minutes != null && fact.duration_minutes > 0
                        ? ` · ${fact.duration_minutes} min`
                        : '')
                    if (fact.participants >= 2 && fact.duration_minutes != null && fact.duration_minutes > 0) {
                      return <Badge variant="success">{label}</Badge>
                    }
                    if (fact.room_destroyed) {
                      return <Badge variant="warning">{label} · no se conectaron</Badge>
                    }
                    return <Badge variant="info">{label} · sin cerrar</Badge>
                  },
                },
                {
                  header: 'Estado',
                  render: (a) => (
                    <Badge variant={statusVariants[a.status] || 'default'}>
                      {statusLabels[a.status] || a.status}
                    </Badge>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
