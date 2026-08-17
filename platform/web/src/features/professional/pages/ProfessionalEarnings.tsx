import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/LinkButton'
import { Alert } from '@/components/ui/Alert'
import { DollarSign, CreditCard, MessageCircle, Mail } from 'lucide-react'

const WHATSAPP_NUMBER = '5214772541540'
const SUPPORT_EMAIL = 'hola@somos-calma.com'

export function ProfessionalEarnings() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Hola, soy profesional en SOMOS-CALMA. Tengo una duda sobre mis ingresos/pagos.'
  )}`
  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    'Duda sobre ingresos — Profesional SOMOS-CALMA'
  )}`

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Mis ingresos</h1>
        <p className="text-text-light mt-1">
          Resumen de tu modelo de ingresos mientras activamos la pasarela de pagos.
        </p>
      </div>

      <Alert variant="info" className="rounded-sm">
        Pronto podrás ver aquí el detalle de sesiones atendidas y pagos. Por ahora coordinamos
        contigo directamente.
      </Alert>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} className="text-primary-dark" />
              Tarifa de sesión
            </CardTitle>
            <CardDescription>Lo que cobra la plataforma por consulta.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text">$400 MXN</p>
            <p className="text-sm text-text-light mt-1">Consulta aislada de 50 minutos.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={20} className="text-primary-dark" />
              Membresía trimestral
            </CardTitle>
            <CardDescription>Costo fijo cada 3 meses.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text">$300 MXN</p>
            <p className="text-sm text-text-light mt-1">Renovación trimestral para mantener tu perfil activo.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>¿Dudas sobre tus ingresos?</CardTitle>
          <CardDescription>
            Escríbenos y te explicamos el detalle de comisiones, pagos y facturación.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <LinkButton variant="outline" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} />
            WhatsApp
          </LinkButton>
          <LinkButton variant="outline" href={mailHref}>
            <Mail size={18} />
            Correo
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  )
}
