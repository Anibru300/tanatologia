import { siteConfig } from '@/lib/siteConfig'
import { Card, CardContent } from '@/components/ui/Card'
import { Shield, Mail, Phone, MapPin } from 'lucide-react'

export function PrivacyPage() {
  const { legal, contact, urls } = siteConfig

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-3">Aviso de Privacidad</h1>
          <p className="text-text-light">
            En SOMOS-CALMA tu información personal está protegida. Este documento explica cómo, para qué y durante cuánto tiempo tratamos tus datos.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-8">
            <p className="text-sm text-text-light mb-6">Última actualización: 20 de junio de 2026</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">1. Responsable del tratamiento</h2>
              <p className="text-text-light mb-3">
                El responsable del tratamiento de los datos personales es <strong>{legal.companyName}</strong>, con domicilio en {legal.address}, {legal.country}.
              </p>
              <ul className="space-y-2 text-text-light">
                <li className="flex items-center gap-2">
                  <Mail size={16} className="text-primary" />
                  <span>{contact.privacy}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={16} className="text-primary" />
                  <span>{legal.phone}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={16} className="text-primary" />
                  <span>{urls.canonical}</span>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">2. Datos que recabamos</h2>
              <div className="grid md:grid-cols-2 gap-4 text-text-light">
                <div>
                  <h3 className="font-medium text-text mb-1">Identificación y contacto</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Nombre completo</li>
                    <li>Correo electrónico</li>
                    <li>Teléfono</li>
                    <li>Domicilio, en su caso</li>
                    <li>Fotografía de perfil</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-text mb-1">Datos sensibles</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Estado de salud física y mental</li>
                    <li>Antecedentes médicos/psicológicos</li>
                    <li>Historial de duelo o crisis</li>
                    <li>Datos de videollamadas terapéuticas</li>
                  </ul>
                  <p className="text-xs mt-2 text-muted">
                    Tratamos estos datos con medidas de seguridad y confidencialidad, únicamente para fines terapéuticos.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">3. Finalidades</h2>
              <h3 className="font-medium text-text mb-1">Primarias</h3>
              <ul className="list-disc list-inside text-text-light text-sm mb-3 space-y-1">
                <li>Prestar servicios de acompañamiento emocional, psicológico y tanatológico.</li>
                <li>Realizar matching entre pacientes y terapeutas.</li>
                <li>Agendar, confirmar y llevar a cabo sesiones terapéuticas.</li>
                <li>Verificar la identidad y cédula profesional de los especialistas.</li>
                <li>Cumplir obligaciones legales, fiscales y regulatorias.</li>
              </ul>
              <h3 className="font-medium text-text mb-1">Secundarias</h3>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>Enviar comunicaciones informativas, promociones y encuestas.</li>
                <li>Mejorar la experiencia de usuario con datos anonimizados.</li>
              </ul>
              <p className="text-sm text-text-light mt-2">
                Puedes negarte a las finalidades secundarias en cualquier momento escribiendo a {contact.privacy}.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">4. Transferencias</h2>
              <p className="text-text-light text-sm mb-2">
                Podemos transferir tus datos a:
              </p>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>El terapeuta asignado, los datos mínimos necesarios para la sesión.</li>
                <li>Prestadores tecnológicos (hosting, correos, videollamadas) bajo contrato de confidencialidad.</li>
                <li>Autoridades competentes ante mandato judicial o riesgo inminente.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">5. Derechos ARCO</h2>
              <p className="text-text-light text-sm mb-3">
                Tienes derecho a Acceso, Rectificación, Cancelación y Oposición. Para ejercerlos, envía una solicitud a {contact.privacy} con tu nombre, identificación oficial y descripción clara del derecho que deseas ejercer.
              </p>
              <p className="text-text-light text-sm">
                Responderemos en un plazo máximo de 20 días hábiles y, en caso de ser procedente, haremos efectivo el derecho dentro de los 15 días hábiles siguientes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">6. Revocación del consentimiento</h2>
              <p className="text-text-light text-sm">
                Puedes revocar el consentimiento para el tratamiento de tus datos personales en cualquier momento, sin efectos retroactivos. La revocación no es obligatoria para nosotros cuando exista una relación jurídica vigente o mandato legal.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">7. Cookies y tecnologías similares</h2>
              <p className="text-text-light text-sm">
                Utilizamos cookies y tecnologías similares para mejorar la experiencia de navegación, recordar tus preferencias y analizar el tráfico de forma agregada. Puedes deshabilitarlas desde la configuración de tu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text mb-3">8. Cambios al aviso de privacidad</h2>
              <p className="text-text-light text-sm">
                Cualquier modificación al presente aviso será publicada en {urls.canonical} y, si es sustancial, te lo notificaremos por correo electrónico.
              </p>
            </section>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-light">
          Si tienes dudas, escríbenos a{' '}
          <a href={`mailto:${contact.privacy}`} className="text-primary hover:underline">
            {contact.privacy}
          </a>
          .
        </p>
      </div>
    </div>
  )
}
