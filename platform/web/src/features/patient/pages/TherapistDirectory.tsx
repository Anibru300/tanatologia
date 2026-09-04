import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Star, Search, Filter, Calendar, Award, CheckCircle, GraduationCap, Languages, Briefcase, Sparkles, MessageSquareQuote } from 'lucide-react'
import { getProfessionalProfiles, type ProfessionalProfile } from '@/features/appointments/appointmentsService'
import { useAuth } from '@/features/auth/useAuth'
import { getMyIntake } from '@/features/intake/intakeService'
import { suggestedSpecialties } from '@/features/intake/intakeContent'
import { getProfessionalReviewsPublic, type ProfessionalReviewPublic } from '@/features/reviews/reviewsService'
import { StarRating } from '@/features/reviews/StarRating'

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

function ReviewList({ professionalProfileId }: { professionalProfileId: string }) {
  const [reviews, setReviews] = useState<ProfessionalReviewPublic[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getProfessionalReviewsPublic(professionalProfileId)
      .then((data) => {
        if (!cancelled) setReviews(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las reseñas')
      })
    return () => {
      cancelled = true
    }
  }, [professionalProfileId])

  if (error) return <p className="text-sm text-text-light">{error}</p>
  if (reviews === null) return <p className="text-sm text-text-light">Cargando reseñas...</p>
  if (reviews.length === 0) return <p className="text-sm text-text-light">Aún no hay reseñas publicadas.</p>

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="p-3 bg-bg-alt rounded-md">
          <div className="flex items-center justify-between mb-1">
            <StarRating value={r.rating} size={14} />
            <span className="text-xs text-text-light">
              {new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {r.comment && <p className="text-sm text-text">{r.comment}</p>}
          <p className="text-xs text-muted mt-1">Paciente verificado</p>
        </li>
      ))}
    </ul>
  )
}

export function TherapistDirectory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('Todas')
  const [therapists, setTherapists] = useState<ProfessionalProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ProfessionalProfile | null>(null)
  const [intakeSpecs, setIntakeSpecs] = useState<string[]>([])
  const [useIntakeMatch, setUseIntakeMatch] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getProfessionalProfiles(), user ? getMyIntake(user.id) : Promise.resolve(null)])
      .then(([data, intake]) => {
        if (cancelled) return
        // Orden: mejor calificación primero
        setTherapists([...data].sort((a, b) => b.rating - a.rating))
        if (intake) {
          const specs = suggestedSpecialties(intake)
          if (specs.length > 0) {
            setIntakeSpecs(specs)
            setUseIntakeMatch(true)
          }
        }
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
  }, [user])

  const filtered = useMemo(() => {
    return therapists.filter((t) => {
      const name = t.full_name.toLowerCase()
      const specs = (t.specialties || []).join(' ').toLowerCase()
      const matchesSearch = name.includes(search.toLowerCase()) || specs.includes(search.toLowerCase())
      const matchesSpecialty = specialty === 'Todas' || (t.specialties || []).some((s) => s.toLowerCase().includes(specialty.toLowerCase()))
      const matchesIntake =
        !useIntakeMatch ||
        intakeSpecs.length === 0 ||
        (t.specialties || []).some((s) => intakeSpecs.some((i) => i.toLowerCase() === s.toLowerCase()))
      return matchesSearch && matchesSpecialty && matchesIntake
    })
  }, [therapists, search, specialty, useIntakeMatch, intakeSpecs])

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
          <p className="text-error-dark">{error}</p>
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
            Profesionales verificados con biografía, formación y reseñas de pacientes. Elige a quien
            mejor se ajuste a lo que necesitas.
          </p>
        </div>

        {intakeSpecs.length > 0 && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="flex items-center justify-between gap-3 p-4 bg-primary/5 border border-primary/20 rounded-md flex-wrap">
              <p className="text-sm text-text flex items-center gap-2">
                <Sparkles size={16} className="text-primary shrink-0" />
                {useIntakeMatch ? (
                  <span>
                    Mostrando profesionales afines a tu encuesta: <strong>{intakeSpecs.join(', ')}</strong>
                  </span>
                ) : (
                  <span>Filtro de tu encuesta desactivado.</span>
                )}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setUseIntakeMatch((v) => !v)}>
                  {useIntakeMatch ? 'Ver todos' : 'Usar mi encuesta'}
                </Button>
                <Link to="/paciente/encuesta">
                  <Button size="sm" variant="ghost">Rehacer encuesta</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

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
                  className="w-full pl-11 pr-4 py-3 rounded-sm border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="relative">
                <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full md:w-56 pl-11 pr-8 py-3 rounded-sm border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
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
              Estamos verificando a los primeros especialistas. Vuelve pronto: durante la Beta el acompañamiento es gratuito.
            </p>
            <Link to="/paciente">
              <Button>Volver a mi espacio</Button>
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
                      {Number(t.rating || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <Star size={16} className="text-warning fill-warning" />
                          <span className="font-semibold text-text">{Number(t.rating).toFixed(1)}</span>
                          {t.rating_count > 0 && <span className="text-xs text-text-light">({t.rating_count})</span>}
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {t.professional_title ? `${t.professional_title} ` : ''}{t.full_name}
                      {t.verification_status === 'verified' && <CheckCircle size={16} className="text-success-dark" />}
                    </CardTitle>
                    <CardDescription>{(t.specialties || []).slice(0, 2).join(' · ') || 'Acompañamiento emocional'}</CardDescription>
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
                    <div className="flex flex-col items-start mt-auto gap-3">
                      <span className="text-lg font-bold text-success-dark">Gratis en la Beta</span>
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
                <p className="text-text-light mb-4">Prueba con otro nombre o especialidad, o quita el filtro de tu encuesta.</p>
                {useIntakeMatch && (
                  <Button variant="outline" onClick={() => setUseIntakeMatch(false)}>Ver todos los profesionales</Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.full_name} className="max-w-2xl">
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 -mt-2">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-bold text-2xl">
                {getInitials(selected.full_name)}
              </div>
              <div>
                <p className="text-text-light">
                  {selected.professional_title ? `${selected.professional_title} · ` : ''}
                  {(selected.specialties || []).slice(0, 2).join(' · ') || 'Acompañamiento emocional'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {selected.verification_status === 'verified' && (
                    <span className="flex items-center gap-1 text-success-dark text-sm">
                      <CheckCircle size={16} /> Verificado
                    </span>
                  )}
                  {Number(selected.rating || 0) > 0 ? (
                    <span className="flex items-center gap-1">
                      <StarRating value={Math.round(selected.rating)} size={14} />
                      <span className="font-semibold text-text">{Number(selected.rating).toFixed(1)}</span>
                      {selected.rating_count > 0 && (
                        <span className="text-sm text-text-light">· {selected.rating_count} reseña{selected.rating_count !== 1 ? 's' : ''}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-text-light">Sin reseñas aún</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-text mb-2">Sobre mí</h4>
              <p className="text-text-light whitespace-pre-line">{selected.bio || 'Especialista en acompañamiento emocional y tanatología.'}</p>
            </div>

            {(selected.education || selected.university || selected.approach || (selected.languages && selected.languages.length > 0) || selected.years_experience != null) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {selected.education && (
                  <div className="flex items-start gap-3 p-4 bg-bg-alt rounded-sm">
                    <GraduationCap size={20} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-text-light">Formación</p>
                      <p className="text-text text-sm font-medium whitespace-pre-line">{selected.education}</p>
                    </div>
                  </div>
                )}
                {!selected.education && selected.university && (
                  <div className="flex items-start gap-3 p-4 bg-bg-alt rounded-sm">
                    <GraduationCap size={20} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-text-light">Universidad</p>
                      <p className="text-text text-sm font-medium">{selected.university}</p>
                    </div>
                  </div>
                )}
                {selected.approach && (
                  <div className="flex items-start gap-3 p-4 bg-bg-alt rounded-sm">
                    <Award size={20} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-text-light">Enfoque terapéutico</p>
                      <p className="text-text text-sm font-medium">{selected.approach}</p>
                    </div>
                  </div>
                )}
                {selected.languages && selected.languages.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-bg-alt rounded-sm">
                    <Languages size={20} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-text-light">Idiomas</p>
                      <p className="text-text text-sm font-medium">{selected.languages.join(', ')}</p>
                    </div>
                  </div>
                )}
                {selected.years_experience != null && (
                  <div className="flex items-start gap-3 p-4 bg-bg-alt rounded-sm">
                    <Briefcase size={20} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-text-light">Experiencia</p>
                      <p className="text-text text-sm font-medium">{selected.years_experience} años</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="font-semibold text-text mb-2 flex items-center gap-2">
                <MessageSquareQuote size={18} className="text-primary" />
                Reseñas de pacientes
              </h4>
              <ReviewList professionalProfileId={selected.id} />
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-sm">
              <span className="text-text">Costo durante la Beta</span>
              <span className="text-2xl font-bold text-success-dark">Gratuito</span>
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
          </div>
        )}
      </Modal>
    </div>
  )
}
