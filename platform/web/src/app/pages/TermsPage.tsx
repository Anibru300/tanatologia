import { siteConfig } from '@/lib/siteConfig'
import { Card, CardContent } from '@/components/ui/Card'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export function TermsPage() {
  const { legal, contact, urls } = siteConfig

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-3">Términos y Condiciones</h1>
          <p className="text-text-light">
            Lee atentamente estos términos. Al usar SOMOS-CALMA aceptas las reglas que rigen nuestra relación contigo.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-8">
            <p className="text-sm text-text-light mb-6">Última actualización: 20 de junio de 2026</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">1. Objeto</h2>
              <p className="text-text-light text-sm">
                Estos Términos regulan el acceso y uso del sitio web {urls.canonical} y la plataforma operada por{' '}
                <strong>{legal.companyName}</strong>. Al registrarte o contratar, declaras ser mayor de edad y aceptas el{' '}
                <Link to="/aviso-de-privacidad" className="text-primary hover:underline">
                  Aviso de Privacidad
                </Link>{' '}
                y la{' '}
                <Link to="/cancelacion" className="text-primary hover:underline">
                  Política de Cancelación
                </Link>
                .
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">2. Naturaleza del servicio</h2>
              <p className="text-text-light text-sm mb-2">
                SOMOS-CALMA es una <strong>plataforma tecnológica</strong> que conecta a personas que buscan acompañamiento emocional, psicológico o tanatológico con profesionales independientes.
              </p>
              <p className="text-text-light text-sm mb-2">
                <strong>No prestamos directamente servicios de salud mental.</strong> Los profesionales son responsables independientes de su práctica, diagnóstico, tratamiento y recomendaciones.
              </p>
              <p className="text-text-light text-sm">
                <strong>La Plataforma no está diseñada para emergencias o crisis suicidas.</strong> Si estás en riesgo, llama al 911, SAPTEL (800-4727-835) o acude a urgencias.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">3. Registro y seguridad</h2>
              <p className="text-text-light text-sm mb-2">Al crear una cuenta te comprometes a:</p>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>Proporcionar información veraz, exacta y actualizada.</li>
                <li>No compartir tus credenciales de acceso.</li>
                <li>Notificar cualquier uso no autorizado.</li>
                <li>No suplantar identidades.</li>
              </ul>
              <p className="text-text-light text-sm mt-2">
                Podemos suspender o cancelar cuentas por información falsa, uso fraudulento o conductas que pongan en riesgo a otros usuarios.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">4. Servicios para pacientes</h2>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>Matching orientativo con profesionales del directorio.</li>
                <li>Agendamiento y gestión de sesiones terapéuticas.</li>
                <li>Acceso a recursos de apoyo según membresía.</li>
              </ul>
              <p className="text-text-light text-sm mt-2">
                La elección final del profesional es responsabilidad del paciente. Debes asistir puntualmente, contar con un espacio privado y mantener comunicación respetuosa.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">5. Servicios para profesionales</h2>
              <p className="text-text-light text-sm mb-2">Para formar parte del directorio deberás:</p>
              <ul className="list-disc list-inside text-text-light text-sm space-y-1">
                <li>Contar con título y cédula profesional vigente en México.</li>
                <li>Estar colegiado o registrado ante las autoridades correspondientes.</li>
                <li>Cumplir con el código de ética de tu profesión.</li>
                <li>Mantener actualizada tu disponibilidad y cumplir las sesiones programadas.</li>
                <li>Guardar estricta confidencialidad de la información de los pacientes.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">6. Membresías, pagos y facturación</h2>
              <p className="text-text-light text-sm mb-2">
                Las membresías se contratan mensual o anualmente y se pagan por adelantado. Se renuevan automáticamente salvo cancelación con al menos 48 horas de anticipación.
              </p>
              <p className="text-text-light text-sm">
                Los precios son en moneda nacional mexicana (MXN), incluyen IVA y pueden modificarse con previo aviso. Puedes solicitar factura dentro de los 30 días naturales siguientes al pago.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">7. Propiedad intelectual</h2>
              <p className="text-text-light text-sm">
                Todos los derechos sobre la marca, logotipo, diseño, código, textos, imágenes, videos, cursos y contenidos son propiedad de SOMOS-CALMA o sus licenciantes. Queda prohibida su reproducción o explotación sin autorización expresa.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-text mb-3">8. Limitación de responsabilidad</h2>
              <p className="text-text-light text-sm">
                SOMOS-CALMA no será responsable por interrupciones derivadas de fallas de conectividad, conductas de profesionales independientes, omisión de buscar atención de emergencia o por daños indirectos derivados del uso de la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text mb-3">9. Ley aplicable y contacto</h2>
              <p className="text-text-light text-sm">
                Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier duda, escríbenos a{' '}
                <a href={`mailto:${contact.legal}`} className="text-primary hover:underline">
                  {contact.legal}
                </a>
                .
              </p>
            </section>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-light">
          Si no estás de acuerdo con estos términos, te solicitamos que no utilices la Plataforma.
        </p>
      </div>
    </div>
  )
}
