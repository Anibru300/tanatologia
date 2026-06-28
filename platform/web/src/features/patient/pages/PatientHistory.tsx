import { Card, CardContent } from '@/components/ui/Card'
import { FileText, Calendar } from 'lucide-react'

const sessions = [
  { id: 1, date: '2026-06-28', therapist: 'Lic. Javier López', type: 'Programa Salud Mental', notes: true },
  { id: 2, date: '2026-06-21', therapist: 'Lic. Javier López', type: 'Programa Salud Mental', notes: true },
]

export function PatientHistory() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Historial de sesiones</h1>
          <p className="text-text-light">Registro de tus sesiones completadas.</p>
        </div>

        <div className="relative border-l-2 border-border ml-4 space-y-8">
          {sessions.map((session) => (
            <div key={session.id} className="relative pl-8">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-text">{session.therapist}</h3>
                      <p className="text-text-light text-sm">{session.type}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-text-light">
                        <Calendar size={14} />
                        {session.date}
                      </div>
                    </div>
                    {session.notes && (
                      <button className="flex items-center gap-2 text-primary text-sm font-medium hover:underline">
                        <FileText size={16} />
                        Ver notas
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
