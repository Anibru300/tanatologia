import { siteConfig } from '@/lib/siteConfig'
import { Card, CardContent } from '@/components/ui/Card'
import { CalendarX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function CancellationPage() {
  const { contact } = siteConfig

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CalendarX className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-3">Política de Cancelación y Reembolsos</h1>
          <p className="text-text-light">
            Te explicamos de forma clara cómo funciona la cancelación de membresías, sesiones y solicitudes de reembolso.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-8">
            <p className="text-sm text-text-light mb-6">Última actualización: 20 de junio de 2026</p>

            <div className="p-4 rounded-[12px] bg-secondary/10 text-secondary text-sm mb-8">
              Al contratar una membresía o agendar una sesión en SOMOS-CALMA, aceptas las reglas de cancelación y reembolso descritas aquí, las cuales forman parte de nuestros{' '}
              <Link to="/terminos" className="underline">
                Términos y Condiciones
              </Link>
              .
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">1. Cancelación de membresías</h2>
              <p className="text-text-light text-sm mb-2">
                Puedes cancelar tu membresía en cualquier momento desde tu Cuenta o enviando un correo a{' '}
                <a href={`mailto:${contact.support}`} className="text-primary hover:underline">
                  {contact.support}
                </a>
                .
              </p>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>La cancelación debe realizarse con al menos 48 horas de anticipación a la renovación para evitar nuevos cargos.</li>
                <li>Podrás seguir usando los servicios contratados hasta el final del periodo vigente.</li>
                <li>Las sesiones no utilizadas dentro de un mes no son acumulables ni transferibles.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">2. Cancelación y reprogramación de sesiones</h2>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>Puedes cancelar o reprogramar sin penalización si lo haces con al menos 24 horas de anticipación.</li>
                <li>Si cancelas con menos de 24 horas, la sesión se considerará utilizada y no se repondrá, salvo causas justificadas (emergencia médica, accidente, fuerza mayor).</li>
                <li>
                  <strong>No show:</strong> si no asistes a una sesión sin avisar, se descontará del paquete y no procederá reembolso.
                </li>
                <li>Si el profesional cancela, te ofreceremos reprogramación sin costo.</li>
                <li>Tolerancia de puntualidad: 15 minutos. Pasado ese tiempo, se considera no show.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">3. Cancelación para profesionales</h2>
              <p className="text-text-light text-sm mb-2">
                Los profesionales pueden cancelar su membresía mensual o anual en cualquier momento, siempre que no tengan sesiones pendientes en los siguientes 7 días.
              </p>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>La membresía mensual se cancela al finalizar el periodo vigente; no hay reembolso parcial.</li>
                <li>La membresía anual no genera reembolso proporcional por cancelación voluntaria, salvo causas justificadas evaluadas por SOMOS-CALMA.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">4. Reembolsos</h2>
              <p className="text-text-light text-sm mb-2">Proceden en los siguientes casos:</p>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>Error en el cobro duplicado.</li>
                <li>Sesión cancelada por SOMOS-CALMA o el profesional sin opción de reprogramación.</li>
                <li>Servicio no prestado por causas imputables a SOMOS-CALMA.</li>
                <li>Cancelación de membresía en los primeros 7 días naturales sin haber usado sesiones ni beneficios.</li>
                <li>Fallecimiento del paciente, previa acreditación.</li>
                <li>Fuerza mayor que impida definitivamente la prestación del servicio.</li>
              </ul>
              <p className="text-text-light text-sm mt-3">
                Para solicitar un reembolso, envía un correo a{' '}
                <a href={`mailto:${contact.support}`} className="text-primary hover:underline">
                  {contact.support}
                </a>{' '}
                con el asunto "Solicitud de reembolso", incluyendo tu nombre, correo registrado, número de orden y motivo detallado. Responderemos en un plazo máximo de 10 días hábiles.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">5. Pausas y casos especiales</h2>
              <p className="text-text-light text-sm mb-2">
                Los pacientes con membresía de 4 sesiones mensuales pueden solicitar una pausa de hasta 30 días una vez cada 6 meses, con al menos 7 días de anticipación. En caso de incapacidad médica comprobada por más de 30 días, se podrá acordar una pausa extraordinaria.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text mb-3">6. Contacto</h2>
              <p className="text-text-light text-sm">
                Ante cualquier duda sobre cancelaciones o reembolsos, escríbenos a{' '}
                <a href={`mailto:${contact.support}`} className="text-primary hover:underline">
                  {contact.support}
                </a>
                .
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
