import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Mail, MessageCircle, AlertTriangle, Send, ChevronDown, PlayCircle, Search, HelpCircle } from 'lucide-react'
import { LinkButton } from '@/components/ui/LinkButton'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { siteConfig } from '@/lib/siteConfig'
import { supabase } from '@/lib/supabase'

type Category = 'Citas' | 'Cuenta' | 'Privacidad' | 'Beta'

const categories: ('Todas' | Category)[] = ['Todas', 'Citas', 'Cuenta', 'Privacidad', 'Beta']

const faqs: { q: string; c: Category; a: React.ReactNode }[] = [
  {
    q: '¿Cómo agendo mi primera cita?',
    c: 'Citas',
    a: 'Ve a "Agendar cita" en el menú lateral: verás el directorio de profesionales verificados. Entra al perfil que te interese para conocer sus especialidades, formación y reseñas, y selecciona el horario que prefieras en su calendario. Al confirmar recibirás un correo con los detalles y, antes de tu sesión, te enviamos recordatorios automáticos.',
  },
  {
    q: '¿Cómo funciona mi videollamada?',
    c: 'Citas',
    a: 'El día de tu sesión entra a "Mis citas" y presiona "Unirse a la sala". La sala se abre 15 minutos antes de tu horario para que pruebes tu cámara y micrófono con calma. Las sesiones duran 50 minutos y el enlace también llega a tu correo. Te recomendamos usar un lugar tranquilo y una conexión estable.',
  },
  {
    q: '¿Puedo cancelar o reprogramar mi cita?',
    c: 'Citas',
    a: 'Sí. Desde "Mis citas" puedes cancelar tu sesión antes de que inicie y el horario se libera automáticamente para que puedas elegir otra fecha. Te sugerimos avisar con tiempo a tu profesional. Puedes consultar los detalles completos en la política de cancelación.',
  },
  {
    q: '¿Qué hago si mi profesional no se conecta?',
    c: 'Citas',
    a: 'Primero verifica que estés dentro de la ventana de acceso (desde 15 minutos antes de la hora de inicio). Si pasada la hora tu profesional no aparece, escríbenos por este formulario o por WhatsApp y te ayudamos a reprogramar tu sesión sin ningún costo ni complicación.',
  },
  {
    q: '¿Cómo elijo al profesional adecuado para mí?',
    c: 'Citas',
    a: 'En el directorio puedes comparar perfiles: especialidades (duelo, ansiedad, tanatología, terapia de pareja…), formación académica, años de experiencia, idiomas y reseñas de otros pacientes. Si completaste la encuesta de registro, te mostramos primero a los profesionales más afines a lo que buscas.',
  },
  {
    q: '¿Tiene algún costo usar la plataforma?',
    c: 'Beta',
    a: 'No. Durante la Beta todo es completamente gratuito para pacientes y profesionales: no pedimos tarjeta ni ningún dato de pago. Si en el futuro se integran pagos, te avisaremos con al menos 30 días de anticipación y tú decides si continuar.',
  },
  {
    q: '¿Olvidé mi contraseña, qué hago?',
    c: 'Cuenta',
    a: 'En la pantalla de inicio de sesión presiona "¿Olvidaste tu contraseña?", escribe el correo con el que te registraste y en pocos minutos recibirás un enlace para restablecerla. Si no ves el correo, revisa tu carpeta de spam.',
  },
  {
    q: '¿Puedo cambiar mi correo o mis datos personales?',
    c: 'Cuenta',
    a: 'Sí. En "Configuración" (menú lateral) puedes cambiar tu correo de acceso y tu contraseña. Tu información personal se actualiza desde "Mi perfil". Si tienes problemas para hacer algún cambio, escríbenos y lo resolvemos contigo.',
  },
  {
    q: '¿Para qué es la encuesta de registro?',
    c: 'Cuenta',
    a: 'Nos ayuda a conocer tus necesidades y mostrarte primero a los profesionales más adecuados para ti. Incluye un tamizaje opcional de bienestar emocional (instrumentos validados PHQ-9 y GAD-7). Es completamente voluntaria, la puedes hacer o actualizar cuando quieras desde tu panel.',
  },
  {
    q: '¿Cómo doy mi opinión o reporto un problema?',
    c: 'Cuenta',
    a: 'Tu opinión nos mejora: usa la sección "Feedback" del menú lateral para enviarnos sugerencias, felicitaciones o reportes (puedes darnos una calificación de 1 a 5 estrellas). También puedes escribirnos directamente por el formulario de esta página o por WhatsApp.',
  },
  {
    q: '¿Las sesiones son confidenciales?',
    c: 'Privacidad',
    a: 'Sí, absolutamente. Todas tus sesiones son privadas y tu información está protegida conforme a nuestro aviso de privacidad. Lo que compartas con tu profesional se trata con estricta confidencialidad profesional.',
  },
  {
    q: '¿Quién puede ver mi información personal?',
    c: 'Privacidad',
    a: 'Solo tú y el profesional que te atiende tienen acceso a tu información de tratamiento; las notas clínicas, por ejemplo, solo las ve tu profesional. El acceso administrativo es mínimo y solo se usa para garantizar el buen funcionamiento y la seguridad de la plataforma.',
  },
]

const externalLink =
  'text-primary-dark font-medium hover:underline'

export function PatientHelp() {
  const [subject, setSubject] = useState('Pregunta desde la sección de Ayuda')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'Todas' | Category>('Todas')

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && !sending

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = category === 'Todas' || faq.c === category
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || faq.q.toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })

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
      setNotice('Recibimos tu pregunta. Te responderemos a tu correo registrado lo antes posible.')
      setSubject('Pregunta desde la sección de Ayuda')
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
          <p className="text-text-light">Resolvemos tus dudas sobre tu portal y tus sesiones.</p>
        </div>

        <Card className="mb-6 border-primary/40 bg-gradient-to-r from-primary/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-dark text-white flex items-center justify-center shrink-0">
                <PlayCircle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text mb-1">¿Primera vez en tu portal?</h3>
                <p className="text-text-light text-sm">
                  Mira el video tutorial de 17 minutos: te mostramos paso a paso cómo agendar tu primera cita y usar todas las secciones.
                </p>
              </div>
              <Link
                to="/paciente/tutoriales"
                className="inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 hover:-translate-y-0.5 px-6 py-3 text-base bg-primary-dark text-white hover:bg-primary-darker shrink-0"
              >
                <PlayCircle size={18} />
                Ver tutorial
              </Link>
            </div>
          </CardContent>
        </Card>

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
            <CardDescription>Busca tu duda o explora por categoría. Toca una pregunta para ver la respuesta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar: cita, contraseña, videollamada…"
                className="w-full rounded-lg border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-light/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-primary-dark text-white'
                      : 'bg-primary/10 text-primary-dark hover:bg-primary/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8 text-text-light text-sm">
                <HelpCircle size={32} className="mx-auto mb-2 text-primary/50" />
                No encontramos resultados para tu búsqueda. Envíanos tu pregunta con el formulario de abajo.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFaqs.map((faq) => {
                  const originalIndex = faqs.indexOf(faq)
                  const isOpen = openFaq === originalIndex
                  return (
                    <div key={originalIndex} className="border border-border rounded-lg overflow-hidden transition-shadow hover:shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : originalIndex)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="flex items-center gap-3">
                          <Badge variant="default" className="shrink-0 hidden sm:inline-flex">{faq.c}</Badge>
                          <span className="font-medium text-text">{faq.q}</span>
                        </span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-primary-dark transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-text-light text-sm leading-relaxed border-t border-border pt-3">
                          {faq.a}
                          {(originalIndex === 2 || originalIndex === 10) && (
                            <>{' '}
                              <a
                                href={originalIndex === 2 ? '/pages/cancelacion.html' : '/pages/aviso-privacidad.html'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={externalLink}
                              >
                                {originalIndex === 2 ? 'Ver política de cancelación' : 'Ver aviso de privacidad'}
                              </a>
                              .
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="formulario-soporte" className="mb-6 scroll-mt-6 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle size={20} className="text-primary-dark" />
              ¿Tienes otra pregunta?
            </CardTitle>
            <CardDescription>
              Escríbela aquí y te respondemos a tu correo registrado. También puedes responder directamente al correo que te enviemos.
            </CardDescription>
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
              />
              <Textarea
                label="Tu pregunta"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={3000}
                placeholder="Escribe tu duda con todo detalle…"
              />
              <div className="pt-2">
                <Button type="submit" disabled={!canSend}>
                  <Send size={16} className="mr-2" />
                  {sending ? 'Enviando…' : 'Enviar mi pregunta'}
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
            <div className="grid sm:grid-cols-2 gap-4">
              <LinkButton variant="outline" href={`mailto:${siteConfig.contact.support}`}>
                <Mail size={18} />
                Correo
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
