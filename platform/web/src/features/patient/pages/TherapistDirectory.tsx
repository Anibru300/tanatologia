import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Star, Search, Filter } from 'lucide-react'

const therapists = [
  {
    id: 1,
    name: 'Dra. María Rodríguez',
    title: 'Psicóloga · Tanatóloga',
    price: '$400',
    rating: 4.9,
    specialties: ['Duelo', 'Pérdida', 'Adultos mayores'],
    bio: '15 años acompañando procesos de duelo y pérdida. Especialista en tanatología clínica.',
    initials: 'MR',
  },
  {
    id: 2,
    name: 'Lic. Javier López',
    title: 'Psicólogo Clínico',
    price: '$400',
    rating: 4.8,
    specialties: ['Ansiedad', 'Estrés', 'Depresión'],
    bio: 'Acompaña ansiedad, estrés, depresión y crisis vitales con enfoque humanista.',
    initials: 'JL',
  },
  {
    id: 3,
    name: 'Dra. Sofía Castro',
    title: 'Tanatóloga · Psicooncóloga',
    price: '$450',
    rating: 4.9,
    specialties: ['Duelo anticipado', 'Diagnóstico', 'Familias'],
    bio: 'Especialista en duelo anticipado, diagnósticos difíciles y pérdidas complejas.',
    initials: 'SC',
  },
]

export function TherapistDirectory() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Encuentra tu terapeuta</h1>
          <p className="text-text-light">Profesionales certificados listos para acompañarte.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre, especialidad..."
              className="w-full pl-11 pr-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter size={18} />
            Filtros
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {therapists.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-bold text-xl">
                    {t.initials}
                  </div>
                  <div className="flex items-center gap-1 text-warning">
                    <Star size={16} fill="currentColor" />
                    <span className="font-semibold text-text">{t.rating}</span>
                  </div>
                </div>
                <CardTitle className="text-lg">{t.name}</CardTitle>
                <CardDescription>{t.title}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-text-light text-sm mb-4 flex-1">{t.bio}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {t.specialties.map((s) => (
                    <Badge key={s} variant="default">{s}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xl font-bold text-text">{t.price}<span className="text-sm font-normal text-text-light">/sesión</span></span>
                  <Button size="sm">Ver perfil</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
