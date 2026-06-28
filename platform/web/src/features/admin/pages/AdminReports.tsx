import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, Users, Calendar, DollarSign } from 'lucide-react'

const reports = [
  { title: 'Crecimiento de usuarios', icon: Users, description: 'Pacientes y profesionales registrados por mes.' },
  { title: 'Citas y sesiones', icon: Calendar, description: 'Volumen de citas, cancelaciones y cumplimiento.' },
  { title: 'Ingresos y comisiones', icon: DollarSign, description: 'Reporte contable de ingresos y pagos.' },
]

export function AdminReports() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Reportes</h1>
          <p className="text-text-light">Descarga reportes operativos y financieros.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reports.map((r) => (
            <Card key={r.title}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <r.icon className="text-primary-dark" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text mb-1">{r.title}</h3>
                    <p className="text-sm text-text-light mb-4">{r.description}</p>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download size={16} />
                      Descargar CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
