import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export function AdminDashboard() {
  const { user } = useAuth()

  const pendingProfessionals = [
    { id: 1, name: 'Dra. Carmen Ruiz', specialty: 'Psicología clínica', submitted: '2026-06-27' },
  ]

  const alerts = [
    { id: 1, message: 'Pago pendiente a profesional: Dra. María Rodríguez', type: 'warning' },
    { id: 2, message: 'Nueva cotización de empresa solicitada', type: 'info' },
  ]

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Panel de administración</h1>
          <p className="text-text-light">Bienvenido, {user?.fullName}. Control total de la plataforma.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">28</p>
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
              <p className="text-3xl font-bold text-text">6</p>
              <p className="text-text-light text-sm">3 verificados · 1 pendiente</p>
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
              <p className="text-3xl font-bold text-text">42</p>
              <p className="text-text-light text-sm">Sesiones completadas</p>
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
              <p className="text-3xl font-bold text-text">$3,240</p>
              <p className="text-text-light text-sm">Comisiones retenidas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profesionales pendientes</CardTitle>
                  <CardDescription>Revisa cédulas y documentos</CardDescription>
                </div>
                <Badge variant="warning">1</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {pendingProfessionals.length > 0 ? (
                <div className="space-y-3">
                  {pendingProfessionals.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 bg-bg-alt rounded-[12px]"
                    >
                      <div>
                        <p className="font-medium text-text">{p.name}</p>
                        <p className="text-sm text-text-light">{p.specialty}</p>
                      </div>
                      <Link to="/admin/profesionales">
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

          <Card>
            <CardHeader>
              <CardTitle>Alertas recientes</CardTitle>
              <CardDescription>Eventos que requieren atención</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 p-4 bg-bg-alt rounded-[12px]"
                    >
                      <AlertCircle
                        size={20}
                        className={a.type === 'warning' ? 'text-warning shrink-0' : 'text-secondary shrink-0'}
                      />
                      <p className="text-text text-sm">{a.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-light">
                  <CheckCircle size={48} className="mx-auto mb-4 text-muted" />
                  <p>No hay alertas activas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Crecimiento mensual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-end justify-around gap-2">
                {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((m, i) => (
                  <div key={m} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-full bg-primary/20 rounded-t-[8px]"
                      style={{ height: `${(i + 1) * 12}%` }}
                    />
                    <span className="text-xs text-text-light">{m}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Reportes rápidos
              </CardTitle>
              <CardDescription>Descarga información para contabilidad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline">Exportar citas</Button>
                <Button variant="outline">Exportar ingresos</Button>
                <Button variant="outline">Exportar profesionales</Button>
                <Button variant="outline">Exportar pacientes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
