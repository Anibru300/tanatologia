import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Save, Percent, Mail } from 'lucide-react'

export function AdminConfig() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Configuración</h1>
          <p className="text-text-light">Ajustes globales de la plataforma.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent size={20} className="text-primary" />
              Comisiones
            </CardTitle>
            <CardDescription>Porcentaje que retiene la plataforma por cada sesión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Comisión por sesión (%)" type="number" defaultValue="10" />
            <Input label="Comisión por membresía (%)" type="number" defaultValue="5" />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={20} className="text-primary" />
              Correos y notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Correo de notificaciones" defaultValue="hola@somos-calma.mx" />
            <div className="flex items-center justify-between py-2">
              <span className="text-text">Recordatorios automáticos</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
            </div>
          </CardContent>
        </Card>

        <Button className="gap-2">
          <Save size={18} />
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
