import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  GraduationCap,
  CalendarDays,
  Clock,
  Video,
  Gift,
  ExternalLink,
  MessageCircle,
  BookOpen,
  CheckCircle,
} from 'lucide-react'
import {
  FORMACION_OFERTAS,
  ofertaVigente,
  vigenciaLegible,
  type OfertaFormacion,
} from '@/features/professional/recursosData'

const ICONOS: Record<string, typeof CalendarDays> = {
  Inicio: CalendarDays,
  Término: CalendarDays,
  Horario: Clock,
  Modalidad: Video,
}

function TarjetaOferta({ oferta }: { oferta: OfertaFormacion }) {
  const vigente = ofertaVigente(oferta)

  return (
    <Card className={`border-l-4 ${vigente ? '' : 'opacity-75'}`} style={{ borderLeftColor: '#C9A28E' }}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {vigente ? (
            <>
              <Badge variant="success" className="gap-1">
                <Gift size={12} />
                Beca 100%
              </Badge>
              <Badge>Inscripción abierta</Badge>
            </>
          ) : (
            <Badge className="gap-1">
              <CheckCircle size={12} />
              Finalizada
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg flex items-start gap-2">
          <GraduationCap size={20} className="text-accent-dark mt-0.5 shrink-0" />
          {oferta.titulo}
        </CardTitle>
        <CardDescription>
          {oferta.organizador}
          {vigente
            ? ` · Inscripciones abiertas hasta el ${vigenciaLegible(oferta)}`
            : ` · Concluyó el ${vigenciaLegible(oferta)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-text-light">{oferta.descripcion}</p>

        <div className="grid sm:grid-cols-2 gap-3">
          {oferta.detalles.map((d) => {
            const Icono = ICONOS[d.label] ?? CalendarDays
            return (
              <div key={d.label} className="flex items-center gap-3 text-sm">
                <Icono size={16} className="text-primary shrink-0" />
                <span>
                  <span className="font-medium text-text">{d.label}: </span>
                  <span className="text-text-light">{d.valor}</span>
                </span>
              </div>
            )
          })}
        </div>

        <div className="text-sm text-text-light bg-bg rounded-md p-3">
          <strong className="text-text">Inversión:</strong> {oferta.costos}
        </div>

        <div>
          <p className="text-sm font-medium text-text mb-2">
            {vigente ? '¿Cómo inscribirte?' : 'Proceso de inscripción (concluido)'}
          </p>
          <ol className="text-sm text-text-light list-decimal list-inside space-y-1">
            {oferta.pasos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>

        {vigente ? (
          <div className="flex flex-wrap gap-3">
            <a href={oferta.urlPrograma} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <ExternalLink size={16} />
                Ver programa completo
              </Button>
            </a>
            <a href={oferta.urlInscripcion} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <MessageCircle size={16} />
                Inscribirme por WhatsApp
              </Button>
            </a>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled className="gap-2">
              <ExternalLink size={16} />
              Inscripción cerrada
            </Button>
            <p className="text-sm text-text-light">
              Esta oportunidad quedó registrada como historial.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

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
        <div className="space-y-6">
          {FORMACION_OFERTAS.map((o) => (
            <TarjetaOferta key={o.id} oferta={o} />
          ))}
        </div>
      </section>

      <p className="text-sm text-text-light text-center">
        Muy pronto podrás subir y compartir materiales (guías, audios, videos) con tus pacientes
        desde esta sección.
      </p>
    </div>
  )
}
