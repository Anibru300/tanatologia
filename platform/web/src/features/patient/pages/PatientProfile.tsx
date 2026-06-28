import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { User, Mail, Phone, Calendar, Heart } from 'lucide-react'

export function PatientProfile() {
  const { user } = useAuth()

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mi perfil</h1>
          <p className="text-text-light">Administra tu información personal y de contacto.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} className="text-primary" />
              Información básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre completo</Label>
                <Input defaultValue={user?.fullName} />
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-[12px] border border-border bg-bg-alt text-text">
                  <Mail size={18} className="text-muted" />
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Teléfono</Label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <Input className="pl-11" placeholder="477 123 4567" />
                </div>
              </div>
              <div>
                <Label>Fecha de nacimiento</Label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <Input type="date" className="pl-11" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart size={20} className="text-primary" />
              Contacto de emergencia
            </CardTitle>
            <CardDescription>Alguien a quien podamos contactar si es necesario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input placeholder="Nombre completo" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input placeholder="477 123 4567" />
              </div>
              <div>
                <Label>Parentesco</Label>
                <Input placeholder="Ej. Cónyuge, hermano/a" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Cancelar</Button>
          <Button>Guardar cambios</Button>
        </div>
      </div>
    </div>
  )
}
