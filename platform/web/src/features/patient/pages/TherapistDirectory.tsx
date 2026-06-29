import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Star, Search, Filter, X, Calendar, MessageCircle, Award, CheckCircle } from 'lucide-react'

const therapists = [
  {
    id: 1,
    name: 'Dra. María Rodríguez',
    title: 'Psicóloga · Tanatóloga',
    price: 400,
    rating: 4.9,
    reviews: 24,
    specialties: ['Duelo', 'Pérdida', 'Adultos mayores'],
    bio: '15 años acompañando procesos de duelo y pérdida. Especialista en tanatología clínica y cuidados paliativos.',
    initials: 'MR',
    verified: true,
    languages: ['Español'],
  },
  {
    id: 2,
    name: 'Lic. Javier López',
    title: 'Psicólogo Clínico',
    price: 400,
    rating: 4.8,
    reviews: 18,
    specialties: ['Ansiedad', 'Estrés', 'Depresión'],
    bio: 'Acompaña ansiedad, estrés, depresión y crisis vitales con enfoque humanista y cognitivo-conductual.',
    initials: 'JL',
    verified: true,
    languages: ['Español', 'Inglés'],
  },
  {
    id: 3,
    name: 'Dra. Sofía Castro',
    title: 'Tanatóloga · Psicooncóloga',
    price: 450,
    rating: 5.0,
    reviews: 12,
    specialties: ['Duelo anticipado', 'Diagnóstico', 'Familias'],
    bio: 'Especialista en duelo anticipado, diagnósticos difíciles y pérdidas complejas. Acompañamiento a familias.',
    initials: 'SC',
    verified: true,
    languages: ['Español'],
  },
]

const specialtyOptions = ['Todas', 'Duelo', 'Ansiedad', 'Estrés', 'Depresión', 'Pérdida', 'Familias']

export function TherapistDirectory() {
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('Todas')
  const [selected, setSelected] = useState<typeof therapists[0] | null>(null)

  const filtered = therapists.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()))
    const matchesSpecialty = specialty === 'Todas' || t.specialties.includes(specialty)
    return matchesSearch && matchesSpecialty
  })

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-text mb-2">Encuentra tu terapeuta</h1>
          <p className="text-text-light">
            Filtra por especialidad o nombre y elige al profesional que mejor se ajuste a lo que necesitas.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o especialidad..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="relative">
                <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full md:w-56 pl-11 pr-8 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                >
                  {specialtyOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-bold text-xl">
                    {t.initials}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-warning fill-warning" />
                    <span className="font-semibold text-text">{t.rating}</span>
                    <span className="text-xs text-text-light">({t.reviews})</span>
                  </div>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {t.name}
                  {t.verified && <CheckCircle size={16} className="text-success" />}
                </CardTitle>
                <CardDescription>{t.title}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-text-light text-sm mb-4 flex-1 line-clamp-3">{t.bio}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {t.specialties.slice(0, 3).map((s) => (
                    <Badge key={s} variant="default">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-auto gap-3">
                  <span className="text-xl font-bold text-text">
                    ${t.price}
                    <span className="text-sm font-normal text-text-light">/sesión</span>
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelected(t)}>
                      Ver perfil
                    </Button>
                    <Link to="/paciente/agendar">
                      <Button size="sm">Agendar</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full bg-bg-alt flex items-center justify-center mb-4">
              <Search size={32} className="text-text-light" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-1">No encontramos resultados</h3>
            <p className="text-text-light">Prueba con otro nombre o especialidad.</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-bold text-2xl">
                    {selected.initials}
                  </div>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {selected.name}
                      {selected.verified && <CheckCircle size={20} className="text-success" />}
                    </CardTitle>
                    <CardDescription className="text-base">{selected.title}</CardDescription>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={16} className="text-warning fill-warning" />
                      <span className="font-semibold text-text">{selected.rating}</span>
                      <span className="text-sm text-text-light">({selected.reviews} reseñas)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-full hover:bg-bg-alt text-text-light"
                >
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-text mb-2">Sobre mí</h4>
                <p className="text-text-light">{selected.bio}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-bg-alt rounded-[12px]">
                  <Award size={20} className="text-primary" />
                  <div>
                    <p className="text-xs text-text-light">Especialidades</p>
                    <p className="text-text text-sm font-medium">{selected.specialties.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-bg-alt rounded-[12px]">
                  <MessageCircle size={20} className="text-primary" />
                  <div>
                    <p className="text-xs text-text-light">Idiomas</p>
                    <p className="text-text text-sm font-medium">{selected.languages.join(', ')}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-[12px]">
                <span className="text-text">Costo por sesión</span>
                <span className="text-2xl font-bold text-primary-dark">${selected.price}</span>
              </div>

              <div className="flex gap-3">
                <Link to="/paciente/agendar" className="flex-1" onClick={() => setSelected(null)}>
                  <Button className="w-full gap-2">
                    <Calendar size={18} />
                    Agendar cita
                  </Button>
                </Link>
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
