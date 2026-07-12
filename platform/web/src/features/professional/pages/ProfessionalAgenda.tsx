import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, ChevronRight, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  type Appointment,
} from '@/features/appointments/appointmentsService'

export function ProfessionalAgenda() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const professionalProfileId = await getProfessionalProfileId(userId)
        if (!professionalProfileId) {
          throw new Error('No se encontró tu perfil profesional.')
        }
        const data = await getAppointmentsForProfessional(professionalProfileId)
        if (!cancelled) setAppointments(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando citas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Agenda</h1>
            <p className="text-text-light">Vista semanal de tus citas.</p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="sm"><ChevronLeft size={18} /></Button>
            <span className="text-text font-medium">Junio 2026</span>
            <Button variant="outline" size="sm"><ChevronRight size={18} /></Button>
          </div>
        </div>

        {loading && <p className="text-text-light mb-4">Cargando citas...</p>}
        {error && <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm mb-4">{error}</div>}
        {!loading && appointments.length === 0 && (
          <p className="text-text-light mb-4">No tienes citas registradas.</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Semana del 23 al 29 de junio</CardTitle>
            <CardDescription>Citas programadas por día.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-6">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="text-center p-2 text-sm font-medium text-text-light">{d}</div>
              ))}
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`text-center p-3 rounded-[12px] text-sm ${i === 5 ? 'bg-primary text-white' : 'bg-bg-alt text-text'}`}
                >
                  {23 + i}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-bg-alt rounded-[12px]">
                  <div>
                    <p className="font-medium text-text">{a.patientName}</p>
                    <p className="text-sm text-text-light">{formatTime(a.scheduled_at)} hrs · {a.serviceName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === 'confirmed' ? 'success' : 'warning'}>
                      {a.status === 'confirmed' ? 'Confirmada' : a.status}
                    </Badge>
                    {a.video_link && (
                      <Link to={`/profesional/sala/${a.id}`}>
                        <Button size="sm" variant="primary" className="gap-1">
                          <Video size={16} />
                          Entrar
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
