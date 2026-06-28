import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { FileText, Save } from 'lucide-react'

export function ProfessionalNotes() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Notas clínicas</h1>
          <p className="text-text-light">Registra la evolución de tus pacientes de forma segura.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nueva nota clínica</CardTitle>
            <CardDescription>La información está protegida y solo tú puedes verla.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              options={[
                { value: '', label: 'Seleccionar paciente' },
                { value: '1', label: 'Ana Martínez' },
                { value: '2', label: 'Luis Hernández' },
              ]}
            />
            <Textarea placeholder="Motivo de consulta" rows={3} />
            <Textarea placeholder="Desarrollo de la sesión" rows={4} />
            <Textarea placeholder="Observaciones y plan de trabajo" rows={3} />
            <Button className="gap-2">
              <Save size={18} />
              Guardar nota
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 space-y-4">
          <h3 className="font-semibold text-text">Notas recientes</h3>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <FileText className="text-primary shrink-0" size={24} />
                <div>
                  <p className="font-medium text-text">Ana Martínez - Sesión 5</p>
                  <p className="text-sm text-text-light">2026-06-28</p>
                  <p className="text-text-light mt-2 text-sm">Paciente reporta menor ansiedad. Continúa con ejercicios de respiración.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
