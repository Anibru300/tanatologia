import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Mail } from 'lucide-react'

const quotes = [
  { id: 1, name: 'Carlos Pérez', email: 'carlos@demo.com', service: 'Plan personalizado', status: 'pending', date: '2026-06-27' },
]

export function AdminQuotes() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Cotizaciones</h1>
          <p className="text-text-light">Solicitudes de cotización enviadas desde la landing.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitudes pendientes</CardTitle>
            <CardDescription>Responde por correo a cada solicitud.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Solicitante</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Servicio</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-text">{q.name}</p>
                          <p className="text-sm text-text-light">{q.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-text">{q.service}</td>
                      <td className="py-4 px-4 text-text-light">{q.date}</td>
                      <td className="py-4 px-4"><Badge variant="warning">Pendiente</Badge></td>
                      <td className="py-4 px-4">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Mail size={16} />
                          Responder
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
