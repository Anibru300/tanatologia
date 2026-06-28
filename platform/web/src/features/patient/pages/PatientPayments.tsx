import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CreditCard, Download } from 'lucide-react'

const payments = [
  { id: 1, date: '2026-06-28', concept: 'Consulta aislada', amount: 400, status: 'paid', method: 'Tarjeta' },
]

export function PatientPayments() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Pagos</h1>
          <p className="text-text-light">Historial de pagos y métodos de pago.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total pagado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$400</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Método principal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                <span className="text-text-light">No configurado</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximo pago</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-light">No hay pagos pendientes</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
            <CardDescription>Tus transacciones en la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Concepto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Método</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Monto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text">{p.date}</td>
                      <td className="py-4 px-4 text-text">{p.concept}</td>
                      <td className="py-4 px-4 text-text-light">{p.method}</td>
                      <td className="py-4 px-4 text-text font-semibold">${p.amount}</td>
                      <td className="py-4 px-4"><Badge variant="success">Pagado</Badge></td>
                      <td className="py-4 px-4">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Download size={16} />
                          Factura
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
