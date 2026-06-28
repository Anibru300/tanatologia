import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Clock, Video } from 'lucide-react'

const appointments = [
  { id: 1, date: '2026-07-02', time: '10:00', therapist: 'Dra. María Rodríguez', status: 'confirmed', type: 'Consulta aislada' },
  { id: 2, date: '2026-06-28', time: '16:00', therapist: 'Lic. Javier López', status: 'completed', type: 'Programa Salud Mental' },
]

export function PatientAppointments() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mis citas</h1>
          <p className="text-text-light">Gestiona tus sesiones programadas y tu historial.</p>
        </div>

        <div className="space-y-4">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text">{apt.therapist}</h3>
                      <Badge variant={apt.status === 'confirmed' ? 'success' : 'info'}>
                        {apt.status === 'confirmed' ? 'Confirmada' : 'Completada'}
                      </Badge>
                    </div>
                    <p className="text-text-light text-sm mb-2">{apt.type}</p>
                    <div className="flex items-center gap-4 text-sm text-text-light">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {apt.date}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {apt.time}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {apt.status === 'confirmed' && (
                      <Button size="sm" className="gap-1">
                        <Video size={16} />
                        Entrar
                      </Button>
                    )}
                    <Button variant="outline" size="sm">Detalles</Button>
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
