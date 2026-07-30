import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getAdminPatients,
  getAdminProfessionals,
  getAdminAppointments,
  type AdminProfessional,
} from './adminService'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  verified: 'Verificado',
  rejected: 'Rechazado',
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patientCount, setPatientCount] = useState(0)
  const [professionals, setProfessionals] = useState<AdminProfessional[]>([])
  const [appointmentsThisMonth, setAppointmentsThisMonth] = useState(0)
  const [completedThisMonth, setCompletedThisMonth] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [patients, profs, appointments] = await Promise.all([
          getAdminPatients(),
          getAdminProfessionals(),
          getAdminAppointments(),
        ])
        if (cancelled) return

        const now = new Date()
        const thisMonth = appointments.filter((a) => {
          const d = new Date(a.scheduled_at)
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        })

        setPatientCount(patients.length)
        setProfessionals(profs)
        setAppointmentsThisMonth(thisMonth.length)
        setCompletedThisMonth(thisMonth.filter((a) => a.status === 'completed').length)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando el panel')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const verifiedCount = professionals.filter((p) => p.verification_status === 'verified').length
  const pendingReview = professionals.filter((p) => p.verification_status === 'in_review')

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Panel de administración</h1>
          <p className="text-text-light">Bienvenido, {user?.fullName}. Control total de la plataforma.</p>
        </div>

        {error && <Alert variant="error" className="mb-6 p-3 rounded-sm">{error}</Alert>}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">{loading ? '…' : patientCount}</p>
              <p className="text-text-light text-sm">Registrados</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle size={20} className="text-secondary" />
                Profesionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">{loading ? '…' : professionals.length}</p>
              <p className="text-text-light text-sm">
                {verifiedCount} verificados · {pendingReview.length} en revisión
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-accent" />
                Citas este mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">{loading ? '…' : appointmentsThisMonth}</p>
              <p className="text-text-light text-sm">{completedThisMonth} sesiones completadas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign size={20} className="text-warning" />
                Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$0</p>
              <p className="text-text-light text-sm">Los pagos aún no están habilitados</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profesionales pendientes</CardTitle>
                <CardDescription>Revisa cédulas y documentos</CardDescription>
              </div>
              <Badge variant={pendingReview.length > 0 ? 'warning' : 'success'}>
                {loading ? '…' : pendingReview.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingReview.length > 0 ? (
              <div className="space-y-3">
                {pendingReview.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 bg-bg-alt rounded-sm"
                  >
                    <div>
                      <p className="font-medium text-text">{p.full_name}</p>
                      <p className="text-sm text-text-light">
                        {STATUS_LABELS[p.verification_status] || p.verification_status}
                        {p.license_number ? ` · Cédula ${p.license_number}` : ''}
                      </p>
                    </div>
                    <Link to="/admin/verificacion">
                      <Button size="sm" variant="outline" className="gap-1">
                        Revisar
                        <ArrowRight size={14} />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-light">
                <CheckCircle size={48} className="mx-auto mb-4 text-muted" />
                <p>No hay solicitudes pendientes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
