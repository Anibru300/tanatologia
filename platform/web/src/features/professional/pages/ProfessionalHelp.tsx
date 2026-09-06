import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/LinkButton'
import { Mail, MessageCircle, Phone, Send } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { siteConfig } from '@/lib/siteConfig'
import { supabase } from '@/lib/supabase'

const faqs = [
  { q: '¿Cómo configuro mi disponibilidad?', a: 'Ve a "Disponibilidad" y selecciona los horarios por día.' },
  { q: '¿Tiene algún costo participar?', a: 'No. Durante la Beta de Somos Calma tu acceso es completamente gratuito; no hay pagos ni membresías.' },
  { q: '¿Cómo subo mis credenciales?', a: 'En "Mi perfil" puedes actualizar tu cédula y especialidades.' },
]

export function ProfessionalHelp() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && !sending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('support-request', {
        body: { subject: subject.trim(), message: message.trim() },
      })
      if (invokeError) {
        const status = (invokeError as { context?: Response }).context?.status
        const backendMsg = data && typeof data === 'object' ? (data as { error?: string }).error : undefined
        throw new Error(
          backendMsg ||
            (status === 429
              ? 'Demasiados mensajes. Espera un minuto e inténtalo de nuevo.'
              : invokeError.message)
        )
      }
      if (!data?.ok) throw new Error(data?.error || 'No se pudo enviar tu mensaje.')
      setNotice('Recibimos tu mensaje. Te responderemos a tu correo registrado lo antes posible.')
      setSubject('')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu mensaje.')
    } finally {
      setSending(false)
    }
  }

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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Enviar mensaje a soporte</CardTitle>
            <CardDescription>Escríbenos desde aquí y te respondemos a tu correo registrado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}
              {notice && <Alert variant="success">{notice}</Alert>}
              <Input
                label="Asunto"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={150}
                placeholder="¿En qué podemos ayudarte?"
              />
              <Textarea
                label="Mensaje"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={3000}
                placeholder="Describe tu duda o problema…"
              />
              <div className="pt-2">
                <Button type="submit" disabled={!canSend}>
                  <Send size={16} className="mr-2" />
                  {sending ? 'Enviando…' : 'Enviar mensaje'}
                </Button>
              </div>
            </form>
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
