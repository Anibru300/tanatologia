import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Heart, Target, Sparkles } from 'lucide-react'

export function PatientPrograms() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mis programas</h1>
          <p className="text-text-light">Avance de tus procesos terapéuticos.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Heart className="text-secondary" size={20} />
                </div>
                <div>
                  <CardTitle>Salud Mental</CardTitle>
                  <CardDescription>4 sesiones · 2 completadas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ProgressBar value={50} />
              <div className="flex items-center gap-2 mt-4 text-sm text-text-light">
                <Sparkles size={16} className="text-warning" />
                <span>¡Vas por la mitad, sigue así!</span>
              </div>
              <Button className="w-full mt-6">Agendar siguiente sesión</Button>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <Target size={48} className="mx-auto mb-4 text-muted" />
              <h3 className="font-semibold text-text mb-2">¿Necesitas un programa nuevo?</h3>
              <p className="text-text-light text-sm mb-4">Explora nuestros programas guiados de 4 y 6 sesiones.</p>
              <Button variant="outline">Ver programas disponibles</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
