import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { LinkButton } from '@/components/ui/LinkButton'
import { CreditCard, MessageSquare, ShieldCheck } from 'lucide-react'
import { siteConfig } from '@/lib/siteConfig'
import { formatCurrency } from '@/lib/utils'

/**
 * Página interim de Pagos: muestra los precios vigentes y los métodos que se
 * están habilitando (issue #3: tarjeta, PayPal, SPEI), con un canal real para
 * coordinar el pago mientras tanto. Sin pasarela todavía: ningún cargo se
 * hace desde la plataforma.
 */
export function PatientPayments() {
  const { pricing } = siteConfig
  const { whatsapp, support } = siteConfig.contact

  const whatsappMessage =
    'Hola, soy paciente de SOMOS-CALMA y quiero coordinar el pago de mi sesión o programa.'
  const whatsappUrl = `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsappMessage)}`

  const options = [
    {
      name: pricing.session.singleLabel,
      price: pricing.session.single,
      detail: '1 sesión individual',
    },
    {
      name: pricing.program4.label,
      price: pricing.program4.price,
      detail: pricing.program4.subtitle,
    },
    {
      name: pricing.program6.label,
      price: pricing.program6.price,
      detail: pricing.program6.subtitle,
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Pagos</h1>
        <p className="text-text-light mt-1">
          Precios vigentes y formas de pago de tus sesiones y programas.
        </p>
      </div>

      <Alert variant="info" className="p-4 rounded-sm">
        Estamos habilitando el pago en línea con <strong>tarjeta de débito/crédito</strong>,{' '}
        <strong>PayPal</strong> y <strong>transferencia SPEI</strong>. Mientras tanto, ningún cargo se
        realiza desde la plataforma: el pago se coordina directamente con el equipo.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        {options.map((option) => (
          <Card key={option.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{option.name}</CardTitle>
              <CardDescription>{option.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-text">
                {formatCurrency(option.price)}{' '}
                <span className="text-sm font-normal text-text-light">{pricing.currency}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard size={20} className="text-primary-dark" />
            ¿Cómo pago hoy?
          </CardTitle>
          <CardDescription>
            Agenda tu sesión desde tu portal y coordina el pago con nosotros por el canal que
            prefieras. Te compartimos las instrucciones y tu comprobante.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <LinkButton
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            className="flex-1"
          >
            <MessageSquare size={18} />
            Coordinar por WhatsApp
          </LinkButton>
          <LinkButton
            href={`mailto:${support}?subject=${encodeURIComponent('Paciente: coordinación de pago')}`}
            variant="outline"
            className="flex-1"
          >
            Escribir por correo
          </LinkButton>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-sm text-text-light">
        <ShieldCheck size={16} className="shrink-0 text-primary-dark" />
        Nunca te pediremos datos de tu tarjeta por WhatsApp ni por correo.
      </p>
    </div>
  )
}
