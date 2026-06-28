import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Video, FileText, Heart, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PatientDashboard() {
  const { user } = useAuth()

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Hola, {user?.fullName}</h1>
          <p className="text-text-light">Este es tu espacio seguro para sanar.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Próxima sesión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-light text-sm mb-4">No tienes sesiones programadas.</p>
              <Link to="/paciente/agendar">
                <Button size="sm" className="w-full">Agendar sesión</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart size={20} className="text-primary" />
                Mi programa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-light text-sm mb-4">No estás inscrito en un programa.</p>
              <Link to="/paciente/programas">
                <Button variant="outline" size="sm" className="w-full">Ver programas</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-light text-sm mb-4">0 sesiones completadas.</p>
              <Button variant="ghost" size="sm" className="w-full">Ver historial</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>Lo que puedes hacer ahora</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/paciente/agendar">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                    <Calendar size={24} />
                    <span>Agendar</span>
                  </Button>
                </Link>
                <Link to="/paciente/terapeutas">
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                    <Video size={24} />
                    <span>Terapeutas</span>
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <MessageCircle size={24} />
                  <span>Mensajes</span>
                </Button>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <FileText size={24} />
                  <span>Recursos</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado de cuenta</CardTitle>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
