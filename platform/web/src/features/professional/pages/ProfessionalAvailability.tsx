import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock, Plus } from 'lucide-react'

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function ProfessionalAvailability() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Disponibilidad</h1>
            <p className="text-text-light">Configura tus horarios de atención.</p>
          </div>
          <Button className="mt-4 md:mt-0 gap-2">
            <Plus size={18} />
            Agregar horario
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map((day) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bg-alt rounded-[12px]">
                    <div className="flex items-center gap-2 text-text-light">
                      <Clock size={16} />
                      <span>09:00 - 13:00</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-error">Eliminar</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-alt rounded-[12px]">
                    <div className="flex items-center gap-2 text-text-light">
                      <Clock size={16} />
                      <span>16:00 - 19:00</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-error">Eliminar</Button>
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
