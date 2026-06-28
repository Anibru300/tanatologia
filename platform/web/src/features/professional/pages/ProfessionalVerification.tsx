import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Upload, CheckCircle, Clock } from 'lucide-react'

export function ProfessionalVerification() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Verificación profesional</h1>
          <p className="text-text-light">Sube tus documentos para aparecer en el directorio.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="text-warning shrink-0" size={32} />
              <div>
                <h3 className="font-semibold text-text">Estado: En revisión</h3>
                <p className="text-text-light text-sm">El equipo de SOMOS-CALMA validará tus documentos en 24-48 horas.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos requeridos</CardTitle>
            <CardDescription>La información es confidencial y solo se usa para validación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Cédula profesional" placeholder="Número de cédula" />
              <Input label="Especialidad" placeholder="Ej. Psicología clínica" />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-text">Identificación oficial</label>
              <div className="border-2 border-dashed border-border rounded-[16px] p-8 text-center hover:bg-bg-alt transition-colors cursor-pointer">
                <Upload className="mx-auto mb-2 text-text-light" size={32} />
                <p className="text-text-light text-sm">Arrastra tu archivo o haz clic para subir</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-text">Constancia de situación fiscal (opcional)</label>
              <div className="border-2 border-dashed border-border rounded-[16px] p-8 text-center hover:bg-bg-alt transition-colors cursor-pointer">
                <Upload className="mx-auto mb-2 text-text-light" size={32} />
                <p className="text-text-light text-sm">Arrastra tu archivo o haz clic para subir</p>
              </div>
            </div>

            <Button className="gap-2">
              <CheckCircle size={18} />
              Enviar a verificación
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
