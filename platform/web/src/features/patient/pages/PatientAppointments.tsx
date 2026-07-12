import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Clock, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAppointmentsForPatient } from '@/features/appointments/mockAppointments'

export function PatientAppointments() {
  const { user } = useAuth()
  const appointments = getAppointmentsForPatient(user?.id || '')

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mis citas</h1>
          <p className="text-text-light">Gestiona tus sesiones programadas y tu historial.</p>
        </div>

        {appointments.length === 0 && (
          <p className="text-text-light">No tienes citas registradas.</p>
        )}

        <div className="space-y-4">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-text">{apt.professionalName}</h3>
                      <Badge variant={apt.status === 'confirmed' ? 'success' : 'info'}>
                        {apt.status === 'confirmed' ? 'Confirmada' : 'Completada'}
                      </Badge>
                    </div>
                    <p className="text-text-light text-sm mb-2">{apt.serviceName}</p>
                    <div className="flex items-center gap-4 text-sm text-text-light">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {apt.date}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {apt.time}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {apt.status === 'confirmed' && (
                      <Link to={`/paciente/sala/${apt.id}`}>
                        <Button size="sm" className="gap-1">
                          <Video size={16} />
                          Entrar
                        </Button>
                      </Link>
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
