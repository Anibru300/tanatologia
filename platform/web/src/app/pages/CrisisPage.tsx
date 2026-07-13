import { siteConfig } from '@/lib/siteConfig'
import { Card, CardContent } from '@/components/ui/Card'
import { Phone, AlertTriangle } from 'lucide-react'

export function CrisisPage() {
  const { crisis } = siteConfig

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-4">
            <AlertTriangle className="text-error" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-3">Líneas de emergencia</h1>
          <p className="text-text-light">{crisis.description}</p>
        </div>

        <div className="p-4 rounded-[12px] bg-error/10 text-error text-sm mb-6 text-center">
          Si tú o alguien cercano está en riesgo inminente, llama al <strong>911</strong> de inmediato.
        </div>

        <div className="grid gap-4 mb-10">
          {crisis.lines.map((line) => (
            <Card key={line.number}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-text text-lg">{line.name}</h3>
                  <p className="text-text-light text-sm">{line.note}</p>
                </div>
                <a
                  href={`tel:${line.number.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition"
                >
                  <Phone size={16} />
                  {line.number}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-text mb-3">¿Cuándo buscar ayuda inmediata?</h2>
            <ul className="list-disc list-inside text-text-light text-sm space-y-2">
              <li>Si tienes pensamientos de hacerte daño o de suicidio.</li>
              <li>Si sientes que podrías hacerle daño a otra persona.</li>
              <li>Si experimentas una crisis de pánico, confusión severa o desconexión de la realidad.</li>
              <li>Si has sufrido una agresión, violencia o abuso reciente.</li>
              <li>Si estás bajo los efectos de sustancias y no puedes mantenerte a salvo.</li>
            </ul>
            <p className="text-text-light text-sm mt-4">
              Recuerda: pedir ayuda es un acto de valentía. No estás solo ni sola.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
