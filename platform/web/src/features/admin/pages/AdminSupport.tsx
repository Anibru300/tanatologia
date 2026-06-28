import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Headphones, Mail } from 'lucide-react'

const tickets = [
  { id: 1, user: 'Ana Martínez', subject: 'Problema para agendar', date: '2026-06-28', status: 'open' },
]

export function AdminSupport() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Soporte</h1>
          <p className="text-text-light">Tickets y solicitudes de ayuda.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones size={20} className="text-primary" />
              Tickets abiertos
            </CardTitle>
            <CardDescription>Atiende las dudas de usuarios y profesionales.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Usuario</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Asunto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text">{t.user}</td>
                      <td className="py-4 px-4 text-text">{t.subject}</td>
                      <td className="py-4 px-4 text-text-light">{t.date}</td>
                      <td className="py-4 px-4"><Badge variant="warning">Abierto</Badge></td>
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
