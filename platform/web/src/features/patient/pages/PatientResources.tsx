import { Card, CardContent } from '@/components/ui/Card'
import { Wind, PenLine, HeartHandshake, Moon, ExternalLink, BookOpen } from 'lucide-react'

interface Resource {
  title: string
  description: string
  href: string
  icon: React.ElementType
  tag: string
}

const RESOURCES: Resource[] = [
  {
    title: 'Entender el duelo: qué es normal y cuándo pedir ayuda',
    description:
      'El duelo no sigue un manual. Aprende qué es normal, cuáles son las tareas del duelo según Worden y cuándo es momento de buscar acompañamiento profesional.',
    href: '/pages/recursos/entender-el-duelo.html',
    icon: HeartHandshake,
    tag: 'Duelo',
  },
  {
    title: 'Ansiedad: primeros auxilios emocionales para momentos difíciles',
    description:
      'Técnicas basadas en evidencia para calmar la ansiedad: respiración diafragmática, grounding 5-4-3-2-1 y relajación muscular progresiva.',
    href: '/pages/recursos/ansiedad-primeros-auxilios.html',
    icon: Wind,
    tag: 'Ansiedad',
  },
  {
    title: 'Carta a quien ya no está: ejercicio de escritura terapéutica',
    description:
      'Un ejercicio de escritura terapéutica basado en la investigación de James Pennebaker para honrar la memoria de quien ya no está.',
    href: '/pages/recursos/carta-a-quien-ya-no-esta.html',
    icon: PenLine,
    tag: 'Escritura',
  },
  {
    title: 'Rutina de sueño en el duelo: descansar cuando el corazón duele',
    description:
      'Consejos prácticos basados en higiene del sueño para mejorar el descanso durante el duelo, cuando el insomnio y la rumia suelen aparecer.',
    href: '/pages/recursos/rutina-de-sueno-en-el-duelo.html',
    icon: Moon,
    tag: 'Sueño',
  },
]

export function PatientResources() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Recursos para tu proceso</h1>
        <p className="text-text-light mt-1">
          Lecturas y ejercicios preparados por el equipo de SOMOS-CALMA para acompañarte entre sesiones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {RESOURCES.map((resource) => {
          const Icon = resource.icon
          return (
            <a
              key={resource.href}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/60 rounded-md"
            >
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardContent className="p-6 flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary-dark flex items-center justify-center shrink-0">
                      <Icon size={22} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary-dark bg-primary/10 rounded-full px-3 py-1">
                      {resource.tag}
                    </span>
                  </div>
                  <h2 className="font-semibold text-text leading-snug">{resource.title}</h2>
                  <p className="text-sm text-text-light flex-1">{resource.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark">
                    Leer artículo
                    <ExternalLink size={15} />
                  </span>
                </CardContent>
              </Card>
            </a>
          )
        })}
      </div>

      <a
        href="/pages/recursos.html"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary-dark hover:underline"
      >
        <BookOpen size={16} />
        Ver todos los recursos del sitio
      </a>
    </div>
  )
}
