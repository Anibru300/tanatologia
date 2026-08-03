import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Phone, Mail, MessageCircle, AlertTriangle } from 'lucide-react'
import { LinkButton } from '@/components/ui/LinkButton'
import { siteConfig } from '@/lib/siteConfig'

const faqs = [
  { q: '¿Cómo agendo una cita?', a: 'Ve a "Agendar cita", elige el tipo de servicio, fecha y hora.' },
  { q: '¿Puedo cancelar una sesión?', a: 'Puedes cancelar o reprogramar tu cita desde tu portal. Consulta la política de cancelación en somos-calma.com/pages/cancelacion.html.' },
  { q: '¿Las sesiones son confidenciales?', a: 'Sí, todas las sesiones son privadas y cumplen con la normativa de protección de datos.' },
]

export function PatientHelp() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Ayuda y soporte</h1>
          <p className="text-text-light">Resolvemos tus dudas.</p>
        </div>

        <Card className="mb-6 border-error/30 bg-error/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-error shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-text mb-1">¿Estás en crisis?</h3>
                <p className="text-text-light text-sm mb-3">
                  Esta plataforma no sustituye la atención de emergencia. Si estás en riesgo, llama a la línea de emergencias.
                </p>
                <a href="tel:911" className="text-error-dark font-semibold hover:underline">Llamar al 911</a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preguntas frecuentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <h4 className="font-medium text-text mb-1">{faq.q}</h4>
                <p className="text-text-light text-sm">{faq.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contactar a soporte</CardTitle>
            <CardDescription>Te respondemos en menos de 24 horas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <LinkButton variant="outline" href={`mailto:${siteConfig.contact.support}`}>
                <Mail size={18} />
                Correo
              </LinkButton>
              <LinkButton variant="outline" href={`tel:+52${siteConfig.legal.phone.replace(/\s/g, '')}`}>
                <Phone size={18} />
                Teléfono
              </LinkButton>
              <LinkButton
                variant="outline"
                href={`https://wa.me/${siteConfig.contact.whatsapp.number}?text=${encodeURIComponent(siteConfig.contact.whatsapp.message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
                WhatsApp
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
