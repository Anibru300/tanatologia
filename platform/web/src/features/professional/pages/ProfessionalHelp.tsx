import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/LinkButton'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { siteConfig } from '@/lib/siteConfig'

const faqs = [
  { q: '¿Cómo configuro mi disponibilidad?', a: 'Ve a "Disponibilidad" y selecciona los horarios por día.' },
  { q: '¿Cuándo recibo mis pagos?', a: 'Estamos integrando pagos en línea (tarjeta, PayPal y transferencia SPEI). Te avisaremos cuando estén disponibles.' },
  { q: '¿Cómo subo mis credenciales?', a: 'En "Mi perfil" puedes actualizar tu cédula y especialidades.' },
]

export function ProfessionalHelp() {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Ayuda y soporte</h1>
          <p className="text-text-light">Resolvemos tus dudas como especialista.</p>
        </div>

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
