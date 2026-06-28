import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, FileText, Video, Headphones } from 'lucide-react'

const resources = [
  { id: 1, title: 'Guía de duelo', type: 'pdf', downloads: 34 },
  { id: 2, title: 'Meditación guiada', type: 'audio', downloads: 12 },
]

export function ProfessionalResources() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Recursos</h1>
            <p className="text-text-light">Materiales para compartir con pacientes.</p>
          </div>
          <Button className="mt-4 md:mt-0 gap-2">
            <Upload size={18} />
            Subir recurso
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {r.type === 'pdf' ? <FileText className="text-primary-dark" size={24} /> :
                     r.type === 'video' ? <Video className="text-primary-dark" size={24} /> :
                     <Headphones className="text-primary-dark" size={24} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text">{r.title}</h3>
                    <p className="text-sm text-text-light capitalize">{r.type}</p>
                    <p className="text-sm text-text-light mt-1">{r.downloads} descargas</p>
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
