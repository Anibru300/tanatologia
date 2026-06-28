import { Card, CardContent } from '@/components/ui/Card'
import { Play, FileText, Headphones, Heart } from 'lucide-react'

const resources = [
  { id: 1, title: 'Meditación para la ansiedad', type: 'audio', duration: '5 min', icon: Headphones },
  { id: 2, title: 'Respiración 4-7-8', type: 'video', duration: '3 min', icon: Play },
  { id: 3, title: 'Hoja de trabajo CBT', type: 'pdf', icon: FileText },
  { id: 4, title: 'Rutina de autocuidado', type: 'article', icon: Heart },
]

export function PatientResources() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Recursos</h1>
          <p className="text-text-light">Ejercicios, meditaciones y lecturas para tu bienestar.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {resources.map((resource) => (
            <Card key={resource.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <resource.icon className="text-primary-dark" size={28} />
                </div>
                <h3 className="font-semibold text-text mb-2">{resource.title}</h3>
                {resource.duration && (
                  <p className="text-sm text-text-light mb-4">{resource.duration}</p>
                )}
                <button className="text-primary text-sm font-medium hover:underline">
                  Abrir recurso
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
