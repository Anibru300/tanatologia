import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

const movements = [
  { id: 1, date: '2026-06-28', concept: 'Consulta Ana Martínez', amount: 300, status: 'paid' },
  { id: 2, date: '2026-06-25', concept: 'Consulta Luis Hernández', amount: 300, status: 'paid' },
]

export function ProfessionalEarnings() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mis ganancias</h1>
          <p className="text-text-light">Ingresos generados en la plataforma.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ganancias del mes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$600</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sesiones este mes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">2</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pago pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$0</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historial de movimientos</CardTitle>
                <CardDescription>Tus ingresos por sesión.</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                <Download size={18} />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Concepto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Monto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text">{m.date}</td>
                      <td className="py-4 px-4 text-text">{m.concept}</td>
                      <td className="py-4 px-4 text-text font-semibold">${m.amount}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          Pagado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
