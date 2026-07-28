import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Calendar, Clock, Video, Check, User, ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getProfessionalProfiles,
  getPatientProfileId,
  getProfessionalAppointmentsForDate,
  createAppointment,
  type ProfessionalProfile,
  type SessionType,
} from '@/features/appointments/appointmentsService'
import {
  getAvailabilityForProfessional,
  computeAvailableSlots,
  type AvailabilityRange,
} from '@/features/availability/availabilityService'
import { sendEmail } from '@/lib/email'

const SESSION_DURATION_MINUTES = 50

const services = [
  {
    id: 'single' as SessionType,
    name: 'Consulta aislada',
    duration: '50 min',
    description: 'Una sesión para hablar de lo que necesites sin compromiso de continuidad.',
  },
  {
    id: 'program_4' as SessionType,
    name: 'Programa Salud Mental',
    duration: '4 sesiones',
    description: 'Espacio guiado para ansiedad, estrés o rutinas de autocuidado.',
  },
  {
    id: 'program_6' as SessionType,
    name: 'Acompañamiento por duelo',
    duration: '6 sesiones',
    description: 'Acompañamiento especializado para atravesar una pérdida.',
  },
]

const steps = [
  { label: 'Servicio', description: 'Elige tu acompañamiento' },
  { label: 'Terapeuta', description: 'Quién te acompañará' },
  { label: 'Horario', description: 'Fecha y hora' },
  { label: 'Confirmar', description: 'Revisa y agenda' },
]

export function BookAppointment() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState<SessionType>('single')
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const [therapists, setTherapists] = useState<ProfessionalProfile[]>([])
  const [loadingTherapists, setLoadingTherapists] = useState(true)
  const [therapistsError, setTherapistsError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [availability, setAvailability] = useState<AvailabilityRange[] | null>(null)
  const [availabilityError, setAvailabilityError] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  const selectedServiceData = services.find((s) => s.id === selectedService)!
  const selectedTherapistData = therapists.find((t) => t.id === selectedTherapist)

  useEffect(() => {
    getProfessionalProfiles()
      .then((data) => {
        setTherapists(data)
        setLoadingTherapists(false)
      })
      .catch((err) => {
        setTherapistsError(err instanceof Error ? err.message : 'Error cargando terapeutas')
        setLoadingTherapists(false)
      })
  }, [])

  // Cargar la disponibilidad del terapeuta seleccionado.
  useEffect(() => {
    setSelectedDate('')
    setSelectedTime('')
    setSlots([])
    setSlotsError('')
    setAvailabilityError('')

    if (!selectedTherapist) {
      setAvailability(null)
      return
    }

    let cancelled = false
    getAvailabilityForProfessional(selectedTherapist)
      .then((data) => {
        if (!cancelled) setAvailability(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setAvailability([])
          setAvailabilityError(
            err instanceof Error ? err.message : 'Error cargando la disponibilidad del profesional'
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedTherapist])

  // Al elegir fecha, calcular los horarios realmente disponibles.
  useEffect(() => {
    setSelectedTime('')
    setSlots([])
    setSlotsError('')

    if (!selectedDate || !selectedTherapist || !availability || availability.length === 0) {
      return
    }

    // Parsear 'YYYY-MM-DD' como fecha local (no UTC).
    const [year, month, day] = selectedDate.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    let cancelled = false
    setLoadingSlots(true)
    getProfessionalAppointmentsForDate(selectedTherapist, selectedDate)
      .then((appointments) => {
        if (cancelled) return
        setSlots(computeAvailableSlots(availability, appointments, date, SESSION_DURATION_MINUTES))
      })
      .catch((err) => {
        if (!cancelled) {
          setSlotsError(err instanceof Error ? err.message : 'Error cargando los horarios disponibles')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate, selectedTherapist, availability])

  const getPrice = (therapist?: ProfessionalProfile) => {
    if (!therapist) return 0
    if (selectedService === 'single') return therapist.session_price
    if (selectedService === 'program_4') return therapist.program_4_price
    return therapist.program_6_price
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-MX')}`
  }

  const canContinue = () => {
    if (step === 0) return true
    if (step === 1) return selectedTherapist !== null
    if (step === 2) return selectedDate && selectedTime
    return true
  }

  const handleConfirm = async () => {
    if (!selectedTherapistData || !selectedDate || !selectedTime || !user) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const patientProfileId = await getPatientProfileId(user.id)
      if (!patientProfileId) {
        throw new Error('No se encontró tu perfil de paciente. Contacta soporte.')
      }

      // Construir la fecha/hora en la zona horaria local del usuario
      // y enviarla como timestamptz (ISO con zona horaria).
      const [year, month, day] = selectedDate.split('-').map(Number)
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString()

      const appointment = await createAppointment({
        patient_profile_id: patientProfileId,
        professional_profile_id: selectedTherapistData.id,
        scheduled_at: scheduledAt,
        duration_minutes: SESSION_DURATION_MINUTES,
        session_type: selectedService,
        serviceName: selectedServiceData.name,
      })

      // Enviar correo de confirmación al paciente
      try {
        await sendEmail({
          to: user.email,
          subject: 'Tu cita en SOMOS-CALMA ha sido confirmada',
          html: `
            <h1>Hola ${user.fullName},</h1>
            <p>Tu cita con <strong>${selectedTherapistData.full_name}</strong> ha sido confirmada.</p>
            <p><strong>Servicio:</strong> ${selectedServiceData.name}</p>
            <p><strong>Fecha:</strong> ${selectedDate}</p>
            <p><strong>Hora:</strong> ${selectedTime}</p>
            <p><strong>Link de videollamada:</strong> <a href="https://anibru300.github.io/tanatologia/app/#/paciente/sala/${appointment.id}">Entrar a la sala</a></p>
          `,
          type: 'appointment_confirmation',
        })
      } catch (emailErr) {
        console.error('Error enviando correo de confirmación:', emailErr)
      }

      setConfirmed(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la cita')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-2xl">
          <Card className="text-center">
            <CardContent className="p-12">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                <Check size={40} className="text-success" />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">¡Cita confirmada!</h2>
              <p className="text-text-light mb-6">
                Te enviamos un correo con los detalles. Recuerda que puedes ingresar a tu portal para verla.
              </p>
              <div className="bg-bg-alt rounded-[16px] p-6 text-left space-y-3 max-w-md mx-auto mb-6">
                <p className="text-text"><strong>Servicio:</strong> {selectedServiceData.name}</p>
                <p className="text-text"><strong>Terapeuta:</strong> {selectedTherapistData?.full_name}</p>
                <p className="text-text"><strong>Fecha:</strong> {selectedDate}</p>
                <p className="text-text"><strong>Hora:</strong> {selectedTime}</p>
              </div>
              <Button onClick={() => navigate('/paciente/citas')}>
                Ver mis citas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text mb-2">Agendar cita</h1>
          <p className="text-text-light">En 4 pasos sencillos programa tu acompañamiento.</p>
        </div>

        <div className="mb-10">
          <Stepper steps={steps} currentStep={step} />
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>¿Qué tipo de acompañamiento necesitas?</CardTitle>
              <CardDescription>Selecciona la opción que mejor se ajuste a ti.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full text-left p-5 rounded-[16px] border-2 transition-all ${
                    selectedService === service.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-text text-lg">{service.name}</h3>
                      <p className="text-sm text-text-light mt-1">{service.description}</p>
                      <p className="text-sm text-text-light mt-2 flex items-center gap-2">
                        <Clock size={14} />
                        {service.duration}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-primary-dark whitespace-nowrap">
                      {selectedTherapistData ? formatPrice(getPrice(selectedTherapistData)) : '—'}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Elige a tu terapeuta</CardTitle>
              <CardDescription>Profesionales certificados disponibles para ti.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingTherapists && (
                <p className="text-text-light text-center py-8">Cargando terapeutas...</p>
              )}
              {therapistsError && (
                <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm">
                  {therapistsError}
                </div>
              )}
              {!loadingTherapists && therapists.map((therapist) => (
                <button
                  key={therapist.id}
                  onClick={() => setSelectedTherapist(therapist.id)}
                  className={`w-full text-left p-4 rounded-[16px] border-2 transition-all flex items-center gap-4 ${
                    selectedTherapist === therapist.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark font-bold text-lg shrink-0">
                    {therapist.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text">{therapist.full_name}</h3>
                    <p className="text-sm text-text-light">{therapist.specialties.slice(0, 2).join(', ')}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={14} className="text-warning fill-warning" />
                      <span className="text-sm text-text font-medium">{therapist.rating}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-text">{formatPrice(getPrice(therapist))}</span>
                    <span className="text-xs text-text-light">/servicio</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Selecciona fecha y hora</CardTitle>
              <CardDescription>Elige el momento que mejor te funcione.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <LabelWithIcon icon={Calendar} text="Fecha" />
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toLocaleDateString('en-CA')}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <LabelWithIcon icon={Clock} text="Horario disponible" />
                {availabilityError && (
                  <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm">
                    {availabilityError}
                  </div>
                )}
                {!availabilityError && availability !== null && availability.length === 0 && (
                  <div className="p-4 rounded-[12px] bg-bg-alt text-text-light text-sm">
                    Este profesional aún no tiene horarios disponibles.
                  </div>
                )}
                {!availabilityError && (!availability || availability.length > 0) && !selectedDate && (
                  <p className="text-sm text-text-light">Primero selecciona una fecha.</p>
                )}
                {!availabilityError && availability !== null && availability.length > 0 && selectedDate && (
                  <>
                    {loadingSlots && <p className="text-sm text-text-light">Cargando horarios...</p>}
                    {slotsError && (
                      <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm">{slotsError}</div>
                    )}
                    {!loadingSlots && !slotsError && slots.length === 0 && (
                      <div className="p-4 rounded-[12px] bg-bg-alt text-text-light text-sm">
                        No hay horarios disponibles para esta fecha. Prueba con otro día.
                      </div>
                    )}
                    {!loadingSlots && !slotsError && slots.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {slots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`px-4 py-3 rounded-[12px] border text-sm font-medium transition-colors ${
                              selectedTime === time
                                ? 'bg-primary text-white border-primary'
                                : 'border-border text-text hover:border-primary bg-surface'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirma tu cita</CardTitle>
              <CardDescription>Revisa los detalles antes de agendar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-bg-alt rounded-[16px] p-6 space-y-4">
                <SummaryRow icon={Check} label="Servicio" value={selectedServiceData.name} />
                <SummaryRow icon={User} label="Terapeuta" value={selectedTherapistData?.full_name || ''} />
                <SummaryRow icon={Calendar} label="Fecha" value={selectedDate} />
                <SummaryRow icon={Clock} label="Hora" value={selectedTime} />
                <SummaryRow icon={Video} label="Modalidad" value="Videollamada privada" />
              </div>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-[12px]">
                <span className="text-text">Total a pagar</span>
                <span className="text-xl font-bold text-primary-dark">
                  {selectedTherapistData ? formatPrice(getPrice(selectedTherapistData)) : '—'}
                </span>
              </div>
              {submitError && (
                <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm">
                  {submitError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeft size={18} />
            Atrás
          </Button>

          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue()}
              className="gap-2"
            >
              Continuar
              <ArrowRight size={18} />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={submitting} className="gap-2">
              <Check size={18} />
              {submitting ? 'Creando cita...' : 'Confirmar cita'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function LabelWithIcon({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-text mb-2">
      <Icon size={16} className="text-primary" />
      {text}
    </label>
  )
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="text-primary shrink-0" size={20} />
      <div>
        <p className="text-xs text-text-light">{label}</p>
        <p className="text-text font-medium">{value}</p>
      </div>
    </div>
  )
}
