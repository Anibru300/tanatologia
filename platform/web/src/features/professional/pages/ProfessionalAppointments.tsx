import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Video, CalendarDays, CheckCircle, XCircle } from 'lucide-react'

const appointments = [
  { id: 1, patient: 'Ana Martínez', date: '2026-06-28', time: '10:00', status: 'confirmed', type: 'Videollamada' },
  { id: 2, patient: 'Luis Hernández', date: '2026-06-28', time: '12:00', status: 'pending', type: 'Videollamada' },
]

export function ProfessionalAppointments() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Mis citas</h1>
            <p className="text-text-light">Gestiona tu agenda de pacientes.</p>
          </div>
          <Button className="mt-4 md:mt-0 gap-2">
            <CalendarDays size={18} />
            Ver calendario
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Citas próximas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Paciente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text font-medium">{a.patient}</td>
                      <td className="py-4 px-4 text-text">{a.date}</td>
                      <td className="py-4 px-4 text-text-light">{a.time}</td>
                      <td className="py-4 px-4 text-text-light">{a.type}</td>
                      <td className="py-4 px-4">
                        <Badge variant={a.status === 'confirmed' ? 'success' : 'warning'}>
                          {a.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="primary" className="gap-1">
                            <Video size={16} />
                            Entrar
                          </Button>
                          <Button size="sm" variant="ghost"><CheckCircle size={16} /></Button>
                          <Button size="sm" variant="ghost" className="text-error"><XCircle size={16} /></Button>
                        </div>
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
