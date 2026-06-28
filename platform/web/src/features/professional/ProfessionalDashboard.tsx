import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Clock, Users, DollarSign, Star, FileText, Video } from 'lucide-react'

export function ProfessionalDashboard() {
  const { user } = useAuth()

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Hola, {user?.fullName}</h1>
          <p className="text-text-light">Gestiona tu práctica y acompaña a tus pacientes.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Citas hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">0</p>
              <p className="text-text-light text-sm">Sin citas programadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Pacientes activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">0</p>
              <p className="text-text-light text-sm">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign size={20} className="text-primary" />
                Ingresos del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$0</p>
              <p className="text-text-light text-sm">Neto después de comisión</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star size={20} className="text-primary" />
                Calificación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">—</p>
              <p className="text-text-light text-sm">Sin evaluaciones aún</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Mi agenda</CardTitle>
              <CardDescription>Próximas sesiones y solicitudes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-text-light">
                <Calendar size={48} className="mx-auto mb-4 text-muted" />
                <p>No tienes citas programadas.</p>
                <Button className="mt-4">Configurar disponibilidad</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Clock size={18} />
                Configurar horarios
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText size={18} />
                Mis notas clínicas
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Video size={18} />
                Sala de videollamada
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <DollarSign size={18} />
                Mis ingresos
              </Button>
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
                <Badge variant="warning">Pendiente</Badge>
                <p className="text-text-light text-sm">
                  Completa tu perfil y sube tu cédula profesional para aparecer en el directorio.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
