import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Check, Mail, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LinkButton } from '@/components/ui/LinkButton'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { siteConfig } from '@/lib/siteConfig'
import { useAuth } from '@/features/auth/AuthProvider'

const { pricing } = siteConfig

export function QuotePage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    serviceType: 'aislada',
    sessions: '1',
    notes: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const sessions = parseInt(formData.sessions)
      const total =
        formData.serviceType === 'aislada'
          ? pricing.session.single * sessions
          : formData.serviceType === 'salud_mental'
            ? pricing.program4.price
            : pricing.program6.price

      // Guardar cotización en Supabase
      const { error: dbError } = await supabase.from('quotes').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        service_type: formData.serviceType,
        sessions: sessions,
        notes: formData.notes,
        total_amount: total * 100, // guardar en centavos
      })

      if (dbError) throw new Error(dbError.message)

      // Solo usuarios autenticados pueden enviar correos desde el frontend.
      // Los visitantes anónimos reciben confirmación en pantalla.
      if (user) {
        await sendEmail({
          to: formData.email,
          subject: 'Hemos recibido tu cotización — SOMOS-CALMA',
          html: `
            <h1>Hola ${formData.name},</h1>
            <p>Recibimos tu solicitud de cotización para <strong>${formData.serviceType}</strong>.</p>
            <p>Sesiones: ${sessions}</p>
            <p>Total estimado: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)}</p>
            <p>Te contactaremos en menos de 24 horas.</p>
          `,
          type: 'quote_confirmation',
        })
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la cotización. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }


  const sessions = parseInt(formData.sessions)
  const total =
    formData.serviceType === 'aislada'
      ? pricing.session.single * sessions
      : formData.serviceType === 'salud_mental'
        ? pricing.program4.price
        : pricing.program6.price

  const whatsappText = encodeURIComponent(
    `Hola, soy ${formData.name || '—'}. Me interesa: ${formData.serviceType === 'aislada' ? `${pricing.session.singleLabel} (${formData.sessions} sesión/es)` : formData.serviceType === 'salud_mental' ? pricing.program4.label : pricing.program6.label}. Total estimado: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(total)}.${formData.notes ? ` Notas: ${formData.notes}` : ''}`
  )

  if (submitted) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-lg mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
                <Check className="text-success-dark" size={32} />
              </div>
              <CardTitle>Cotización enviada</CardTitle>
              <CardDescription>
                Hemos recibido tu solicitud. Te contactaremos en menos de 24 horas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-light text-sm mb-4">
                Mientras tanto, puedes crear una cuenta y explorar nuestros profesionales.
              </p>
              {user ? (
                <Link to="/paciente">
                  <Button>Ir a mi panel</Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button>Crear cuenta</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-sm font-semibold tracking-wider uppercase text-primary-dark mb-4">
            Cotización
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-4">
            Solicita tu cotización personalizada
          </h1>
          <p className="text-text-light">
            Cuéntanos qué necesitas y te enviaremos opciones adaptadas a tu momento.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos de contacto</CardTitle>
            <CardDescription>Usaremos esta información para enviarte la cotización.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tu nombre"
                    required
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="477 123 4567"
                  />
                </div>
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="hola@ejemplo.com"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de servicio</Label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-4 py-3 rounded-sm border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="aislada">{pricing.session.singleLabel} (${pricing.session.single})</option>
                    <option value="salud_mental">{pricing.program4.label} {pricing.program4.sessions} sesiones (${pricing.program4.price.toLocaleString('es-MX')})</option>
                    <option value="duelo">{pricing.program6.label} {pricing.program6.sessions} sesiones (${pricing.program6.price.toLocaleString('es-MX')})</option>
                  </select>
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.sessions}
                    onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Notas adicionales</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Cuéntanos un poco sobre lo que necesitas..."
                  className="w-full px-4 py-3 rounded-sm border border-border bg-surface text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="bg-bg-alt rounded-sm p-4 flex items-center justify-between">
                <span className="text-text-light">Estimado total:</span>
                <span className="text-2xl font-bold text-text">
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(total)}
                </span>
              </div>

              {error && <Alert variant="error" className="p-3 rounded-sm">{error}</Alert>}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  <Mail size={18} />
                  {isLoading ? 'Enviando...' : 'Enviar cotización por correo'}
                </Button>
                <LinkButton
                  variant="outline"
                  className="flex-1"
                  href={`https://wa.me/${siteConfig.contact.whatsapp.number}?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={18} />
                  Enviar por WhatsApp
                </LinkButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
