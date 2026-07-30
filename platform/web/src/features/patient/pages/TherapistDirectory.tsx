import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Star, Search, Filter, X, Calendar, Award, CheckCircle } from 'lucide-react'
import { getProfessionalProfiles, type ProfessionalProfile } from '@/features/appointments/appointmentsService'

const specialtyOptions = ['Todas', 'Duelo', 'Ansiedad', 'Estrés', 'Depresión', 'Pérdida', 'Familias']

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString('es-MX')}`
}

export function TherapistDirectory() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('Todas')
  const [therapists, setTherapists] = useState<ProfessionalProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ProfessionalProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProfessionalProfiles()
      .then((data) => {
        if (!cancelled) setTherapists(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el directorio')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = therapists.filter((t) => {
    const name = t.full_name.toLowerCase()
    const specs = (t.specialties || []).join(' ').toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase()) || specs.includes(search.toLowerCase())
    const matchesSpecialty = specialty === 'Todas' || (t.specialties || []).some((s) => s.toLowerCase().includes(specialty.toLowerCase()))
    return matchesSearch && matchesSpecialty
  })

  if (loading) {
    return (
      <div className="section-calma">
        <div className="container-calma text-center py-16">
          <p className="text-text-light">Cargando profesionales...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="section-calma">
        <div className="container-calma text-center py-16">
          <p className="text-error">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-text mb-2">Encuentra tu terapeuta</h1>
          <p className="text-text-light">
            Filtra por especialidad o nombre y elige al profesional verificado que mejor se ajuste a lo que necesitas.
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

        {therapists.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full bg-bg-alt flex items-center justify-center mb-4">
              <Award size={32} className="text-text-light" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-1">Pronto tendremos profesionales disponibles</h3>
            <p className="text-text-light max-w-md mx-auto mb-6">
              Estamos verificando a los primeros especialistas. Mientras tanto, puedes solicitar una cotización y te contactaremos para asignarte al terapeuta adecuado.
            </p>
            <Link to="/cotizacion">
              <Button>Solicitar cotización</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t) => (
                <Card key={t.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-bold text-xl">
                        {getInitials(t.full_name)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-warning fill-warning" />
                        <span className="font-semibold text-text">{Number(t.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {t.full_name}
                      {t.verification_status === 'verified' && <CheckCircle size={16} className="text-success" />}
                    </CardTitle>
                    <CardDescription>Psicólogo · Tanatólogo</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-text-light text-sm mb-4 flex-1 line-clamp-3">{t.bio || 'Especialista en acompañamiento emocional y tanatología.'}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(t.specialties || []).slice(0, 3).map((s) => (
                        <Badge key={s} variant="default">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-auto gap-3">
                      <span className="text-xl font-bold text-text">
                        {formatPrice(t.session_price)}
                        <span className="text-sm font-normal text-text-light">/sesión</span>
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelected(t)}>
                          Ver perfil
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate('/paciente/agendar', { state: { therapistId: t.id } })}
                        >
                          Agendar
                        </Button>
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
          </>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/40 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-bold text-2xl">
                    {getInitials(selected.full_name)}
                  </div>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {selected.full_name}
                      {selected.verification_status === 'verified' && <CheckCircle size={20} className="text-success" />}
                    </CardTitle>
                    <CardDescription className="text-base">Psicólogo · Tanatólogo</CardDescription>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={16} className="text-warning fill-warning" />
                      <span className="font-semibold text-text">{Number(selected.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-bg-alt text-text-light">
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-text mb-2">Sobre mí</h4>
                <p className="text-text-light">{selected.bio || 'Especialista en acompañamiento emocional y tanatología.'}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-bg-alt rounded-[12px]">
                  <Award size={20} className="text-primary" />
                  <div>
                    <p className="text-xs text-text-light">Especialidades</p>
                    <p className="text-text text-sm font-medium">{(selected.specialties || []).join(', ') || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-[12px]">
                <span className="text-text">Costo por sesión</span>
                <span className="text-2xl font-bold text-primary-dark">{formatPrice(selected.session_price)}</span>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    setSelected(null)
                    navigate('/paciente/agendar', { state: { therapistId: selected.id } })
                  }}
                >
                  <Calendar size={18} />
                  Agendar cita
                </Button>
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
