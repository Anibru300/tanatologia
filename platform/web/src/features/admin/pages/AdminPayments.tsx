import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle } from 'lucide-react'

const payments = [
  { id: 1, professional: 'Dra. María Rodríguez', amount: 540, status: 'pending', period: 'Junio 2026' },
]

export function AdminPayments() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Pagos a profesionales</h1>
          <p className="text-text-light">Gestiona la dispersión de pagos.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pagos pendientes</CardTitle>
            <CardDescription>Profesionales por pagar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Profesional</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Periodo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Monto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text">{p.professional}</td>
                      <td className="py-4 px-4 text-text-light">{p.period}</td>
                      <td className="py-4 px-4 text-text font-semibold">${p.amount}</td>
                      <td className="py-4 px-4"><Badge variant="warning">Pendiente</Badge></td>
                      <td className="py-4 px-4">
                        <Button size="sm" className="gap-1">
                          <CheckCircle size={16} />
                          Marcar pagado
                        </Button>
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
