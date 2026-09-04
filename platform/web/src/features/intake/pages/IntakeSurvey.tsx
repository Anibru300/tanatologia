import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Textarea } from '@/components/ui/Textarea'
import { Heart, ArrowLeft, ArrowRight, SkipForward, Phone } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { saveIntake } from '../intakeService'
import {
  NEED_TYPES,
  TOPIC_OPTIONS,
  GENDER_OPTIONS,
  TIME_OPTIONS,
  FIRST_THERAPY_OPTIONS,
  PHQ9_ITEMS,
  GAD7_ITEMS,
  FREQUENCY_OPTIONS,
  scorePhq9,
  scoreGad7,
  phq9Level,
  gad7Level,
  type IntakeData,
} from '../intakeContent'

const STEP_TITLES = [
  'Cuéntanos qué necesitas',
  '¿Qué tipo de acompañamiento buscas?',
  '¿Qué te gustaría trabajar?',
  'Tus preferencias',
  'Tu motivo (opcional)',
  'Tamizaje opcional',
]

export function IntakeSurvey() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<IntakeData>({
    needType: null,
    topics: [],
    therapistGender: null,
    preferredTime: null,
    firstTherapy: null,
    reasonText: '',
    screeningDone: false,
    phq9: Array(PHQ9_ITEMS.length).fill(-1),
    gad7: Array(GAD7_ITEMS.length).fill(-1),
  })
  const [doScreening, setDoScreening] = useState<boolean | null>(null)

  const crisisFlag = useMemo(() => (data.phq9[8] ?? 0) > 0, [data.phq9])
  const phq9Done = data.phq9.every((v) => v >= 0)
  const gad7Done = data.gad7.every((v) => v >= 0)

  const nextDisabled =
    (step === 1 && data.needType === null) ||
    (step === 2 && data.topics.length === 0) ||
    (step === 3 && (data.therapistGender === null || data.preferredTime === null || data.firstTherapy === null)) ||
    (step === 5 && doScreening === null) ||
    (step === 6 && !phq9Done) ||
    (step === 7 && !gad7Done)

  const update = <K extends keyof IntakeData>(key: K, value: IntakeData[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  const handleFinish = async () => {
    if (!user) return
    try {
      setSaving(true)
      setError('')
      await saveIntake(user.id, { ...data, screeningDone: doScreening === true }, data.reasonText)
      navigate('/paciente/terapeutas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu encuesta.')
      setSaving(false)
    }
  }

  const next = () => {
    if (step === 5) {
      if (doScreening === null) return
      if (!doScreening) {
        handleFinish()
        return
      }
      setStep(6)
      return
    }
    if (step === 6 && phq9Done) setStep(7)
    else if (step === 7 && gad7Done) setStep(8)
    else setStep((s) => s + 1)
  }

  const back = () => setStep((s) => Math.max(0, s - 1))

  const screeningStep = step === 6 || step === 7
  const totalSteps = 8
  const progress = Math.min(100, (step / totalSteps) * 100)

  return (
    <div className="section-calma min-h-screen">
      <div className="container-calma max-w-2xl">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Heart size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">{STEP_TITLES[Math.min(step, 5)]}</h1>
          <p className="text-text-light text-sm mt-1">
            Paso {Math.min(step + 1, totalSteps)} de {totalSteps + 1}
          </p>
          <ProgressBar value={progress} className="mt-4" />
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card>
          <CardContent className="p-6">
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-text">
                  Para recomendarte al profesional que mejor se ajuste a ti, te haremos algunas
                  preguntas sobre lo que estás buscando. Toma <strong>2 minutos</strong>.
                </p>
                <p className="text-text-light text-sm">
                  Tus respuestas son confidenciales y solo las usamos para orientar tu búsqueda.
                  Al final puedes responder un <strong>tamizaje opcional</strong> (no es un
                  diagnóstico) basado en instrumentos validados (PHQ-9 y GAD-7).
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {NEED_TYPES.map((n) => (
                  <button
                    key={n.value}
                    type="button"
                    onClick={() => update('needType', n.value)}
                    className={`w-full text-left p-4 rounded-md border transition-colors ${
                      data.needType === n.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-text">{n.label}</p>
                    <p className="text-sm text-text-light">{n.hint}</p>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <p className="text-sm text-text-light mb-3">Elige todos los que apliquen.</p>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_OPTIONS.map((t) => {
                    const active = data.topics.includes(t.value)
                    return (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          update(
                            'topics',
                            active ? data.topics.filter((v) => v !== t.value) : [...data.topics, t.value]
                          )
                        }
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                          active
                            ? 'bg-primary-dark text-white border-primary-dark'
                            : 'bg-surface text-text-light border-border hover:border-primary/50'
                        }`}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <p className="font-medium text-text mb-2">¿Prefieres que tu profesional sea…?</p>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => update('therapistGender', g.value)}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                          data.therapistGender === g.value
                            ? 'bg-primary-dark text-white border-primary-dark'
                            : 'bg-surface text-text-light border-border hover:border-primary/50'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-text mb-2">¿En qué horario prefieres tus sesiones?</p>
                  <div className="flex flex-wrap gap-2">
                    {TIME_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => update('preferredTime', t.value)}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                          data.preferredTime === t.value
                            ? 'bg-primary-dark text-white border-primary-dark'
                            : 'bg-surface text-text-light border-border hover:border-primary/50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-text mb-2">¿Es tu primera vez en terapia?</p>
                  <div className="flex flex-wrap gap-2">
                    {FIRST_THERAPY_OPTIONS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => update('firstTherapy', f.value)}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                          data.firstTherapy === f.value
                            ? 'bg-primary-dark text-white border-primary-dark'
                            : 'bg-surface text-text-light border-border hover:border-primary/50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <Textarea
                  label="¿Qué te gustaría contarle a tu profesional? (opcional)"
                  rows={5}
                  placeholder="Describe en tus palabras lo que te trae aquí. Solo lo verá tu profesional."
                  value={data.reasonText}
                  onChange={(e) => update('reasonText', e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted mt-1">{data.reasonText.length}/500 caracteres</p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <p className="text-text">
                  De forma <strong>opcional</strong>, puedes responder dos cuestionarios breves y
                  validados internacionalmente (PHQ-9 para síntomas depresivos y GAD-7 para
                  ansiedad). Toman menos de 3 minutos.
                </p>
                <Alert variant="info">
                  Este tamizaje <strong>no es un diagnóstico</strong>. El resultado lo verás tú y
                  servirá como contexto para tu profesional. Puedes saltarlo sin problema.
                </Alert>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setDoScreening(true)}
                    className={`flex-1 p-4 rounded-md border text-left transition-colors ${
                      doScreening === true ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-text">Sí, quiero responderlos</p>
                    <p className="text-sm text-text-light">PHQ-9 (9 preguntas) + GAD-7 (7 preguntas)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoScreening(false)}
                    className={`flex-1 p-4 rounded-md border text-left transition-colors ${
                      doScreening === false ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-text">Ahora no</p>
                    <p className="text-sm text-text-light">Puedes completarlos después</p>
                  </button>
                </div>
              </div>
            )}

            {screeningStep && (
              <div className="space-y-4">
                <p className="text-sm text-text-light">
                  Durante las <strong>últimas 2 semanas</strong>, ¿con qué frecuencia le han
                  molestado los siguientes problemas?
                </p>
                {(step === 6 ? PHQ9_ITEMS : GAD7_ITEMS).map((item, i) => {
                  const answers = step === 6 ? data.phq9 : data.gad7
                  const setAnswers = (v: number[]) =>
                    step === 6 ? update('phq9', v) : update('gad7', v)
                  return (
                    <div key={item} className="p-3 rounded-md border border-border">
                      <p className="text-sm font-medium text-text mb-2">
                        {i + 1}. {item}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {FREQUENCY_OPTIONS.map((f) => (
                          <button
                            key={f.value}
                            type="button"
                            aria-pressed={answers[i] === f.value}
                            onClick={() => setAnswers(answers.map((a, j) => (j === i ? f.value : a)))}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                              answers[i] === f.value
                                ? 'bg-primary-dark text-white border-primary-dark'
                                : 'bg-surface text-text-light border-border hover:border-primary/50'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {step === 6 && crisisFlag && (
                  <Alert variant="error">
                    <p className="flex items-start gap-2">
                      <Phone size={18} className="shrink-0 mt-0.5" />
                      <span>
                        Gracias por tu honestidad. Si has tenido pensamientos de hacerte daño,{' '}
                        <strong>no estás solo/a</strong>: llama a la{' '}
                        <strong>Línea de la Vida 800 911 2000</strong> (24 h, gratuita), al{' '}
                        <strong>SAPTEL 55 5259 8121</strong> o al <strong>911</strong>. También
                        puedes ver nuestra página de{' '}
                        <a href="/pages/crisis.html" className="underline font-semibold">líneas de emergencia</a>.
                      </span>
                    </p>
                  </Alert>
                )}
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <CardHeader className="p-0">
                  <CardTitle>Tu tamizaje (no es un diagnóstico)</CardTitle>
                  <CardDescription>
                    Compártelo con tu profesional si lo deseas. La entrevista clínica siempre es la
                    fuente principal.
                  </CardDescription>
                </CardHeader>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-bg-alt rounded-md text-center">
                    <p className="text-3xl font-bold text-text">{scorePhq9(data.phq9)}</p>
                    <p className="text-sm text-text-light">PHQ-9 · {phq9Level(scorePhq9(data.phq9))}</p>
                  </div>
                  <div className="p-4 bg-bg-alt rounded-md text-center">
                    <p className="text-3xl font-bold text-text">{scoreGad7(data.gad7)}</p>
                    <p className="text-sm text-text-light">GAD-7 · {gad7Level(scoreGad7(data.gad7))}</p>
                  </div>
                </div>
                {crisisFlag && (
                  <Alert variant="error">
                    <p className="flex items-start gap-2">
                      <Phone size={18} className="shrink-0 mt-0.5" />
                      <span>
                        Si sigues teniendo pensamientos de lastimarte, busca ayuda ahora:{' '}
                        <strong>Línea de la Vida 800 911 2000</strong> (24 h),{' '}
                        <strong>SAPTEL 55 5259 8121</strong> o <strong>911</strong>.
                      </span>
                    </p>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-8">
              <div>
                {step === 0 ? (
                  <Button variant="ghost" onClick={() => navigate('/paciente')} disabled={saving}>
                    <SkipForward size={16} className="mr-1" /> Saltar por ahora
                  </Button>
                ) : step <= 5 ? (
                  <Button variant="ghost" onClick={back} disabled={saving}>
                    <ArrowLeft size={16} className="mr-1" /> Atrás
                  </Button>
                ) : null}
              </div>
              {step < 8 ? (
                <Button onClick={next} disabled={nextDisabled} className="gap-1">
                  {step === 5 && doScreening === false ? 'Finalizar' : step === 7 ? 'Ver resultado' : 'Siguiente'}
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={saving} className="gap-1">
                  {saving ? 'Guardando...' : 'Ver profesionales para mí'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
