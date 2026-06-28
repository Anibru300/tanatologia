import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Heart, Calendar, Shield, MessageCircle } from 'lucide-react'

export function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="section-calma">
        <div className="container-calma">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-sm font-semibold tracking-wider uppercase text-primary-dark mb-4">
                Tu acompañante de 7 a.m. a 11 p.m.
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text leading-tight mb-6">
                No estés en soledad, date un respiro
              </h1>
              <p className="text-lg text-text-light mb-8">
                Psicólogos y tanatólogos certificados listos para acompañarte por internet.
                Consultas desde $400 y programas de 4 o 6 sesiones.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button size="lg">Quiero una sesión</Button>
                </Link>
                <Link to="/cotizacion">
                  <Button variant="outline" size="lg">Solicitar cotización</Button>
                </Link>
              </div>
            </div>
            <div className="bg-surface rounded-[28px] p-8 shadow-lg">
              <div className="aspect-square rounded-[20px] bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
                <Heart size={120} className="text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="section-calma alt">
        <div className="container-calma">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold tracking-wider uppercase text-primary-dark mb-4">
              Cómo funciona
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Un camino sencillo hacia el alivio
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: 'Cuéntanos qué necesitas',
                desc: 'Responde unas pocas preguntas para entender tu momento.',
              },
              {
                icon: Calendar,
                title: 'Elige tu terapeuta y horario',
                desc: 'Te mostramos profesionales certificados según tu caso.',
              },
              {
                icon: Shield,
                title: 'Comienza tu proceso',
                desc: 'Sesión privada por videollamada en un espacio seguro.',
              },
            ].map((step, i) => (
              <Card key={i} className="text-center">
                <CardHeader>
                  <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="text-primary-dark" size={28} />
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Opciones */}
      <section className="section-calma">
        <div className="container-calma">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold tracking-wider uppercase text-primary-dark mb-4">
              Opciones
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              Elige lo que tu momento necesita
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Consulta aislada</CardTitle>
                <CardDescription>Para esos días en los que solo necesitas hablar.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-text mb-4">$400 <span className="text-base font-normal text-text-light">/ sesión</span></p>
                <ul className="space-y-2 text-sm text-text-light mb-6">
                  <li>• 1 sesión de 50 minutos</li>
                  <li>• Psicólogo o tanatólogo certificado</li>
                  <li>• Videollamada privada</li>
                </ul>
                <Link to="/register">
                  <Button className="w-full">Agendar</Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="ring-2 ring-primary">
              <CardHeader>
                <div className="inline-block px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold mb-3">
                  Más popular
                </div>
                <CardTitle>Programa Salud Mental</CardTitle>
                <CardDescription>Un espacio definido para cuidar tu salud emocional.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-text mb-4">4 <span className="text-base font-normal text-text-light">sesiones</span></p>
                <ul className="space-y-2 text-sm text-text-light mb-6">
                  <li>• 4 sesiones guiadas</li>
                  <li>• Ansiedad, estrés o autocuidado</li>
                  <li>• Material de apoyo</li>
                </ul>
                <Link to="/register">
                  <Button className="w-full">Comenzar programa</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Acompañamiento por duelo</CardTitle>
                <CardDescription>Especializado en pérdida, muerte o ruptura.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-text mb-4">$2,200 <span className="text-base font-normal text-text-light">/ 6 sesiones</span></p>
                <ul className="space-y-2 text-sm text-text-light mb-6">
                  <li>• 6 sesiones con tanatólogo</li>
                  <li>• Mapas mentales y actividades</li>
                  <li>• Ritmo respetuoso</li>
                </ul>
                <Link to="/register">
                  <Button variant="outline" className="w-full">Solicitar programa</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
