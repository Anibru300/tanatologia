import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Video, Mic, MicOff, Camera, CameraOff, PhoneOff } from 'lucide-react'
import { useState } from 'react'

export function ProfessionalVideoRoom() {
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Sala de videollamada</h1>
          <p className="text-text-light">Inicia o únete a una sesión con tu paciente.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Unirse a sesión</CardTitle>
            <CardDescription>Próximamente integración con Jitsi Meet.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="ID de la sala o enlace"
              className="flex-1 px-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button className="gap-2">
              <Video size={18} />
              Entrar a la sala
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8">
            <div className="aspect-video bg-bg-alt rounded-[24px] flex items-center justify-center mb-6">
              <p className="text-text-light">Vista previa de cámara</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`p-4 rounded-full ${micOn ? 'bg-bg-alt text-text' : 'bg-error/10 text-error'}`}
              >
                {micOn ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`p-4 rounded-full ${cameraOn ? 'bg-bg-alt text-text' : 'bg-error/10 text-error'}`}
              >
                {cameraOn ? <Camera size={24} /> : <CameraOff size={24} />}
              </button>
              <button className="p-4 rounded-full bg-error text-white">
                <PhoneOff size={24} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
