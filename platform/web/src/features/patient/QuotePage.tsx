import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Check, Mail, MessageCircle } from 'lucide-react'

export function QuotePage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // TODO: Send quote via email (Resend) and WhatsApp
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSubmitted(true)
    setIsLoading(false)
  }

  const prices: Record<string, number> = {
    aislada: 400,
    salud_mental: 1600,
    duelo: 2200,
  }

  const total = prices[formData.serviceType] * parseInt(formData.sessions)

  if (submitted) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-lg mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
                <Check className="text-success" size={32} />
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
              <Button onClick={() => window.location.href = '/register'}>
                Crear cuenta
              </Button>
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
                    className="w-full px-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="aislada">Consulta aislada ($400)</option>
                    <option value="salud_mental">Programa Salud Mental 4 sesiones ($1,600)</option>
                    <option value="duelo">Acompañamiento por duelo 6 sesiones ($2,200)</option>
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
                  className="w-full px-4 py-3 rounded-[12px] border border-border bg-surface text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="bg-bg-alt rounded-[12px] p-4 flex items-center justify-between">
                <span className="text-text-light">Estimado total:</span>
                <span className="text-2xl font-bold text-text">
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(total)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  <Mail size={18} />
                  {isLoading ? 'Enviando...' : 'Enviar cotización por correo'}
                </Button>
                <Button type="button" variant="outline" className="flex-1">
                  <MessageCircle size={18} />
                  Enviar por WhatsApp
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
