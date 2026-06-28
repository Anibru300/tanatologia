import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Camera, Star } from 'lucide-react'

export function ProfessionalProfile() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mi perfil profesional</h1>
          <p className="text-text-light">Gestiona tu información pública y credenciales.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary-dark">
                  MR
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md text-text-light hover:text-primary">
                  <Camera size={16} />
                </button>
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-text">Dra. María Rodríguez</h2>
                <p className="text-text-light">Psicóloga clínica</p>
                <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
                  <Star size={16} className="text-warning fill-warning" />
                  <span className="text-sm text-text font-medium">4.9</span>
                  <span className="text-sm text-text-light">(12 reseñas)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información profesional</CardTitle>
            <CardDescription>Actualiza tus datos y especialidades.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Nombre completo" defaultValue="María Rodríguez" />
              <Input label="Correo electrónico" defaultValue="profesional@demo.com" />
              <Input label="Cédula profesional" defaultValue="12345678" />
              <Select
                label="Especialidad principal"
                options={[
                  { value: 'psicologia', label: 'Psicología clínica' },
                  { value: 'tanatologia', label: 'Tanatología' },
                  { value: 'psiquiatria', label: 'Psiquiatría' },
                ]}
              />
            </div>
            <Textarea label="Biografía" defaultValue="Especialista en duelo y trauma con más de 10 años de experiencia." rows={4} />
            <Button>Guardar cambios</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
