import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Save, FileText, Image } from 'lucide-react'

export function AdminCMS() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Contenidos</h1>
          <p className="text-text-light">Edita textos de la landing y recursos públicos.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Landing page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Título principal" defaultValue="SOMOS-CALMA" />
            <Textarea label="Subtítulo" defaultValue="Acompañamiento profesional en momentos difíciles." rows={2} />
            <Textarea label="Sección " defaultValue="Contamos con un equipo de especialistas certificados..." rows={4} />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image size={20} className="text-primary" />
              Imágenes
            </CardTitle>
            <CardDescription>Gestiona logos e imágenes públicas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-[16px] p-8 text-center">
              <p className="text-text-light text-sm">Arrastra imágenes aquí o haz clic para subir</p>
            </div>
          </CardContent>
        </Card>

        <Button className="gap-2">
          <Save size={18} />
          Publicar cambios
        </Button>
      </div>
    </div>
  )
}
