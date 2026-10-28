import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GraduationCap, CalendarDays, Clock, Video, Gift, ExternalLink, MessageCircle, BookOpen } from 'lucide-react'

const BECA_URL = 'https://www.certificaciones.online/beca-juego'
const INSCRIPCION_WA = 'https://wa.me/527341287563'

const DETALLES = [
  { icon: CalendarDays, label: 'Inicio', valor: '17 de noviembre de 2026' },
  { icon: CalendarDays, label: 'Término', valor: '2 de febrero de 2027' },
  { icon: Clock, label: 'Horario', valor: 'Martes y jueves, 6:00 a 9:00 p.m.' },
  { icon: Video, label: 'Modalidad', valor: 'Online sincrónico' },
]

export function ProfessionalResources() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <BookOpen size={24} className="text-primary" />
          Recursos
        </h1>
        <p className="text-text-light mt-1">
          Formación, certificaciones y —muy pronto— materiales para compartir con tus pacientes.
        </p>
      </div>

      <section aria-labelledby="formacion-title">
        <h2 id="formacion-title" className="text-lg font-semibold text-text mb-4">
          Formación y certificaciones
        </h2>

        <Card className="border-l-4" style={{ borderLeftColor: '#C9A28E' }}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="success" className="gap-1">
                <Gift size={12} />
                Beca 100%
              </Badge>
              <Badge>Nueva</Badge>
            </div>
            <CardTitle className="text-lg flex items-start gap-2">
              <GraduationCap size={20} className="text-accent-dark mt-0.5 shrink-0" />
              Certificación Institucional en Psicoterapia de Juego (MCC)
            </CardTitle>
            <CardDescription>
              Federación Mexicana de Psicología, A.C. (FMP) · Inscripción y mensualidades gratis
              con beca del 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-text-light">
              Aprende los fundamentos de la terapia de juego: desarrollo infantil y psicopatología,
              técnicas lúdicas, diseño y conducción de sesiones, trabajo con padres, evaluación y
              ética. Programa de 6 módulos.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {DETALLES.map((d) => (
                <div key={d.label} className="flex items-center gap-3 text-sm">
                  <d.icon size={16} className="text-primary shrink-0" />
                  <span>
                    <span className="font-medium text-text">{d.label}: </span>
                    <span className="text-text-light">{d.valor}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="text-sm text-text-light bg-bg rounded-md p-3">
              <strong className="text-text">Inversión:</strong> la capacitación es gratuita (beca del
              100% en inscripción y mensualidades al adquirir el ejemplar). Al finalizar, de forma
              opcional, puedes solicitar constancia simplificada ($3,000 MXN) o el proceso de
              certificación ($5,000 MXN).
            </div>

            <div>
              <p className="text-sm font-medium text-text mb-2">¿Cómo inscribirte?</p>
              <ol className="text-sm text-text-light list-decimal list-inside space-y-1">
                <li>Adquiere el ejemplar desde la página de la beca.</li>
                <li>
                  Envía por WhatsApp tu número de código, nombre completo y la certificación a la que
                  te inscribes al <strong className="text-text">734 128 7563</strong>.
                </li>
                <li>Recibirás por WhatsApp las indicaciones para continuar tu inscripción.</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href={BECA_URL} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">
                  <ExternalLink size={16} />
                  Ver programa completo
                </Button>
              </a>
              <a href={INSCRIPCION_WA} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <MessageCircle size={16} />
                  Inscribirme por WhatsApp
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="text-sm text-text-light text-center">
        Muy pronto podrás subir y compartir materiales (guías, audios, videos) con tus pacientes
        desde esta sección.
      </p>
    </div>
  )
}
