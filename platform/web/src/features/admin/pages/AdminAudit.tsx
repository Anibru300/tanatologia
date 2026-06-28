import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Shield } from 'lucide-react'

const logs = [
  { id: 1, user: 'admin@demo.com', action: 'Inicio de sesión', date: '2026-06-28 10:00', type: 'auth' },
  { id: 2, user: 'profesional@demo.com', action: 'Actualización de perfil', date: '2026-06-27 15:30', type: 'update' },
]

export function AdminAudit() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Auditoría</h1>
          <p className="text-text-light">Registro de eventos relevantes del sistema.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              Logs de actividad
            </CardTitle>
            <CardDescription>Últimos eventos registrados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Usuario</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acción</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text">{log.user}</td>
                      <td className="py-4 px-4 text-text">{log.action}</td>
                      <td className="py-4 px-4 text-text-light">{log.date}</td>
                      <td className="py-4 px-4">
                        <Badge variant={log.type === 'auth' ? 'info' : 'default'}>
                          {log.type === 'auth' ? 'Autenticación' : 'Actualización'}
                        </Badge>
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
