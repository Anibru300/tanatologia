import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { LinkButton } from '@/components/ui/LinkButton'
import { Button } from '@/components/ui/Button'
import { MessageSquare, Mail, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { siteConfig } from '@/lib/siteConfig'

interface MessagesInterimProps {
  /** A quién contacta el usuario a través de soporte */
  audience: 'patient' | 'professional'
  /** Ruta a la lista de citas del rol */
  appointmentsTo: string
  appointmentsLabel: string
}

/**
 * Página interim de Mensajes: mientras no existe el chat seguro dentro de la
 * plataforma, ofrece canales reales de contacto (WhatsApp y correo) en lugar
 * de una página muerta de "Próximamente".
 */
export function MessagesInterim({ audience, appointmentsTo, appointmentsLabel }: MessagesInterimProps) {
  const navigate = useNavigate()
  const { whatsapp, support } = siteConfig.contact

  const whatsappMessage =
    audience === 'patient'
      ? 'Hola, soy paciente de SOMOS-CALMA y necesito comunicarme con mi terapeuta.'
      : 'Hola, soy profesional de SOMOS-CALMA y necesito apoyo con un paciente o mi agenda.'
  const whatsappUrl = `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsappMessage)}`

  const mailSubject =
    audience === 'patient' ? 'Paciente: contacto con mi terapeuta' : 'Profesional: soporte de plataforma'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Mensajes</h1>
        <p className="text-text-light mt-1">
          Estamos construyendo un chat seguro dentro de la plataforma. Mientras tanto, estos son los
          canales oficiales para comunicarte con nosotros.
        </p>
      </div>

      <Alert variant="info" className="p-4 rounded-sm">
        Si tu mensaje es sobre una cita próxima (reagendar, avisar un imprevisto), escríbenos por
        WhatsApp indicando la fecha y hora de tu sesión para atenderte más rápido.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare size={20} className="text-primary-dark" />
              WhatsApp
            </CardTitle>
            <CardDescription>Respuesta más rápida · {whatsapp.hours}</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              className="w-full"
            >
              Abrir WhatsApp
            </LinkButton>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail size={20} className="text-primary-dark" />
              Correo
            </CardTitle>
            <CardDescription>{support} · respondemos en 1-2 días hábiles</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton
              href={`mailto:${support}?subject=${encodeURIComponent(mailSubject)}`}
              variant="outline"
              className="w-full"
            >
              Escribir correo
            </LinkButton>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-text-light shrink-0" />
        <p className="text-sm text-text-light">
          Para ver los detalles de tus sesiones:{' '}
          <Button variant="ghost" size="sm" onClick={() => navigate(appointmentsTo)}>
            {appointmentsLabel}
          </Button>
        </p>
      </div>
    </div>
  )
}
