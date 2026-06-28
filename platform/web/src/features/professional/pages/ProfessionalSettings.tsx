import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Bell, Shield, Save } from 'lucide-react'

export function ProfessionalSettings() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Configuración</h1>
          <p className="text-text-light">Personaliza tu cuenta y preferencias.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-text">Nuevas citas</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text">Recordatorios de sesión</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text">Nuevos mensajes</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              Seguridad
            </CardTitle>
            <CardDescription>Cambia tu contraseña y activa verificación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Contraseña actual" type="password" />
            <Input label="Nueva contraseña" type="password" />
            <Input label="Confirmar contraseña" type="password" />
          </CardContent>
        </Card>

        <Button className="gap-2">
          <Save size={18} />
          Guardar preferencias
        </Button>
      </div>
    </div>
  )
}
