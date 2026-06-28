import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Users, Calendar, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'

export function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Panel de administración</h1>
          <p className="text-text-light">Bienvenido, {user?.fullName}. Control total de la plataforma.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">0</p>
              <p className="text-text-light text-sm">Registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle size={20} className="text-primary" />
                Profesionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">0</p>
              <p className="text-text-light text-sm">Verificados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Citas este mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">0</p>
              <p className="text-text-light text-sm">Sesiones completadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign size={20} className="text-primary" />
                Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$0</p>
              <p className="text-text-light text-sm">Comisiones retenidas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Profesionales pendientes de verificación</CardTitle>
              <CardDescription>Revisa cédulas y documentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-text-light">
                <CheckCircle size={48} className="mx-auto mb-4 text-muted" />
                <p>No hay solicitudes pendientes.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas recientes</CardTitle>
              <CardDescription>Eventos que requieren atención</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-text-light">
                <AlertCircle size={48} className="mx-auto mb-4 text-muted" />
                <p>No hay alertas activas.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Reportes rápidos</CardTitle>
              <CardDescription>Descarga información para contabilidad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
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
