import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, ChevronRight, Video } from 'lucide-react'

const appointments = [
  { id: 1, patient: 'Ana Martínez', time: '10:00', status: 'confirmed' },
  { id: 2, patient: 'Luis Hernández', time: '12:00', status: 'pending' },
]

export function ProfessionalAgenda() {
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
                    <p className="font-medium text-text">{a.patient}</p>
                    <p className="text-sm text-text-light">{a.time} hrs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === 'confirmed' ? 'success' : 'warning'}>
                      {a.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </Badge>
                    <Button size="sm" variant="primary" className="gap-1">
                      <Video size={16} />
                      Entrar
                    </Button>
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
