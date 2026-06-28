import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar } from 'lucide-react'

const appointments = [
  { id: 1, patient: 'Ana Martínez', professional: 'Dra. María Rodríguez', date: '2026-06-28', time: '10:00', status: 'confirmed' },
]

export function AdminAppointments() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Citas</h1>
          <p className="text-text-light">Supervisión de todas las sesiones agendadas.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Citas programadas
            </CardTitle>
            <CardDescription>Todas las citas de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Paciente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Profesional</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4 text-text">{a.patient}</td>
                      <td className="py-4 px-4 text-text">{a.professional}</td>
                      <td className="py-4 px-4 text-text">{a.date}</td>
                      <td className="py-4 px-4 text-text-light">{a.time}</td>
                      <td className="py-4 px-4"><Badge variant="success">Confirmada</Badge></td>
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
