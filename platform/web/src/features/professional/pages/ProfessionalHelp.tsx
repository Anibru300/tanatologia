import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Mail, MessageCircle, Send, ChevronDown, PlayCircle, Search, HelpCircle } from 'lucide-react'
import { LinkButton } from '@/components/ui/LinkButton'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { siteConfig } from '@/lib/siteConfig'
import { supabase } from '@/lib/supabase'

type Category = 'Verificación' | 'Agenda' | 'Videollamada' | 'Perfil' | 'Beta'

const categories: ('Todas' | Category)[] = ['Todas', 'Verificación', 'Agenda', 'Videollamada', 'Perfil', 'Beta']

const linkStyle = 'text-primary-dark font-medium hover:underline'

const faqs: { q: string; c: Category; a: React.ReactNode }[] = [
  {
    q: '¿Cómo publico mi disponibilidad para recibir citas?',
    c: 'Agenda',
    a: (
      <>
        Ve a <Link to="/profesional/disponibilidad" className={linkStyle}>Disponibilidad</Link> y crea bloques de fecha y
        hora específicos desde el calendario. Cada bloque equivale a una sesión de 50 minutos: el sistema evita que dos
        citas se traslapen y los pacientes solo pueden agendar sobre horarios que ya publicaste. Puedes editar o eliminar
        bloques futuros en cualquier momento; los que ya tienen cita confirmada no se pueden mover. En el video tutorial de
        Agenda te lo mostramos paso a paso.
      </>
    ),
  },
  {
    q: '¿Cómo me verifico para aparecer en el directorio?',
    c: 'Verificación',
    a: (
      <>
        En <Link to="/profesional/verificacion" className={linkStyle}>Verificación</Link> captura tu número de cédula
        profesional y sube tus documentos (cédula, título y, cuando se solicite, identificación). Al enviar a revisión,
        nuestro equipo valida tu cédula en el registro público de la SEP y en 24–48 horas tu perfil queda aprobado y visible
        para los pacientes. Te avisamos por correo y con una notificación en el portal.
      </>
    ),
  },
  {
    q: '¿Dónde veo mis citas y cómo entro a la videollamada?',
    c: 'Agenda',
    a: (
      <>
        Todas tus sesiones aparecen en <Link to="/profesional/agenda" className={linkStyle}>Agenda</Link>, ordenadas por
        fecha. Desde ahí entras a la sala de videollamada con un solo clic; también puedes usar el acceso directo del menú
        lateral. La sala se habilita 15 minutos antes de cada cita. Al confirmarse o cancelarse una cita recibes una
        notificación automática.
      </>
    ),
  },
  {
    q: '¿Cómo funcionan las videollamadas? ¿Necesito instalar algo?',
    c: 'Videollamada',
    a: 'No. La videollamada se abre directamente en el navegador (Chrome, Edge o Firefox recomendados), sin instalar programas ni crear cuentas. Al entrar verás una prueba de cámara y micrófono: verifica que el navegador tenga permisos concedidos. Si tu firewall o red corporativa bloquea la llamada, usa el botón "Abrir en pestaña nueva" que aparece en la pantalla de error, o intenta desde otra red.',
  },
  {
    q: '¿Qué pasa si mi paciente no se conecta a la sesión?',
    c: 'Videollamada',
    a: 'La sala del paciente también se abre 15 minutos antes; espera dentro de la sala al menos 15 minutos después de la hora de inicio. Si no aparece, puedes registrar la ausencia en tu agenda y escribirnos por este formulario si necesitas liberar o ajustar ese horario. Los recordatorios automáticos (24 h y 15 min antes) reducen mucho las faltas.',
  },
  {
    q: '¿Cómo escribo notas clínicas de mis sesiones?',
    c: 'Agenda',
    a: (
      <>
        Desde <Link to="/profesional/agenda" className={linkStyle}>Agenda</Link>, cada cita completada tiene la opción de
        agregar notas clínicas. Solo tú puedes verlas: el paciente no tiene acceso y otros profesionales tampoco. Úsalas para
        registrar evolución, acuerdos y puntos a trabajar en la siguiente sesión. Te recomendamos completarlas el mismo día
        de la cita.
      </>
    ),
  },
  {
    q: '¿Cómo completo mi perfil para que los pacientes me elijan?',
    c: 'Perfil',
    a: (
      <>
        En <Link to="/profesional/perfil" className={linkStyle}>Mi perfil</Link> actualiza tu foto, biografía, formación
        académica, especialidades, idiomas y años de experiencia. El directorio muestra todo esto junto con tus reseñas, así
        que un perfil completo y cálido aumenta mucho las solicitudes de cita. También puedes añadir un video de presentación
        si lo tienes.
      </>
    ),
  },
  {
    q: '¿Dónde veo la información de mis pacientes?',
    c: 'Agenda',
    a: (
      <>
        En <Link to="/profesional/pacientes" className={linkStyle}>Pacientes</Link> encuentras a quienes han agendado
        contigo, con su historial de citas, la encuesta de registro que completaron (cuando la compartieron) y tus notas
        clínicas. Recuerda que su información está protegida: úsala solo para fines de tu acompañamiento profesional.
      </>
    ),
  },
  {
    q: '¿Cómo recibo y respondo las reseñas de mis pacientes?',
    c: 'Perfil',
    a: 'Al terminar una cita, el paciente puede dejarte una reseña anónima con calificación de 1 a 5 estrellas y un comentario. Las reseñas se publican en tu perfil del directorio y alimentan tu promedio visible. No puedes editarlas, pero si recibes una reseña que consideres inapropiada, escríbenos por este formulario y la revisamos.',
  },
  {
    q: '¿Tiene algún costo participar como profesional?',
    c: 'Beta',
    a: 'No. Durante la Beta de Somos Calma tu acceso es completamente gratuito: no hay comisiones, membresías ni pagos de ningún tipo, y no te pediremos datos bancarios. Si en el futuro se integra algún modelo de pago, te avisaremos con al menos 30 días de anticipación y tú decides si continuar.',
  },
  {
    q: '¿Olvidé mi contraseña o quiero cambiar mi correo?',
    c: 'Perfil',
    a: 'En la pantalla de inicio de sesión presiona "¿Olvidaste tu contraseña?" y recibirás un correo para restablecerla (revisa spam si no llega). Para cambiar tu correo de acceso o tu contraseña dentro del portal, usa la sección Configuración del menú lateral.',
  },
  {
    q: '¿Cómo doy mi opinión o reporto un problema con la plataforma?',
    c: 'Beta',
    a: (
      <>
        Tu experiencia como especialista nos ayuda a mejorar: usa <Link to="/profesional/feedback" className={linkStyle}>Feedback</Link> en
        el menú lateral para enviarnos sugerencias, felicitaciones o reportes con calificación de 1 a 5 estrellas. También
        puedes escribirnos directamente por el formulario de esta página o por WhatsApp.
      </>
    ),
  },
]

export function ProfessionalHelp() {
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
          <p className="text-text-light">Resolvemos tus dudas sobre tu práctica dentro de la plataforma.</p>
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
                  Tenemos 4 video tutoriales para ti: dashboard y perfil, agenda y disponibilidad, verificación de credenciales y feedback. Aprende a usar todo en menos de 20 minutos.
                </p>
              </div>
              <Link
                to="/profesional/tutoriales"
                className="inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 hover:-translate-y-0.5 px-6 py-3 text-base bg-primary-dark text-white hover:bg-primary-darker shrink-0"
              >
                <PlayCircle size={18} />
                Ver tutoriales
              </Link>
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
                placeholder="Buscar: disponibilidad, cédula, videollamada…"
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
