import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Calendar, Clock, Video, Check, User, ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { addAppointment } from '@/features/appointments/mockAppointments'
import { generateJitsiRoomName } from '@/lib/video'

const timeSlots = ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00', '19:00']

const services = [
  {
    id: 'single',
    name: 'Consulta aislada',
    price: '$400',
    duration: '50 min',
    description: 'Una sesión para hablar de lo que necesites sin compromiso de continuidad.',
  },
  {
    id: 'program4',
    name: 'Programa Salud Mental',
    price: '$1,600',
    duration: '4 sesiones',
    description: 'Espacio guiado para ansiedad, estrés o rutinas de autocuidado.',
  },
  {
    id: 'program6',
    name: 'Acompañamiento por duelo',
    price: '$2,200',
    duration: '6 sesiones',
    description: 'Acompañamiento especializado para atravesar una pérdida.',
  },
]

const therapists = [
  {
    id: 'profesional',
    name: 'Dra. María Demo',
    specialty: 'Tanatología clínica',
    rating: 4.9,
    reviews: 24,
    price: '$400',
    image: 'MD',
  },
  {
    id: 'profesional-2',
    name: 'Lic. Javier López',
    specialty: 'Psicología clínica',
    rating: 4.8,
    reviews: 18,
    price: '$400',
    image: 'JL',
  },
  {
    id: 'profesional-3',
    name: 'Dra. Sofía Castro',
    specialty: 'Psicooncología',
    rating: 5.0,
    reviews: 12,
    price: '$450',
    image: 'SC',
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
  const [selectedService, setSelectedService] = useState('single')
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const selectedServiceData = services.find((s) => s.id === selectedService)!
  const selectedTherapistData = therapists.find((t) => t.id === selectedTherapist)

  const canContinue = () => {
    if (step === 0) return true
    if (step === 1) return selectedTherapist !== null
    if (step === 2) return selectedDate && selectedTime
    return true
  }

  const handleConfirm = () => {
    if (!selectedTherapistData || !selectedDate || !selectedTime) return

    const appointmentId = crypto.randomUUID()
    addAppointment({
      id: appointmentId,
      patientId: user?.id || 'paciente',
      patientName: user?.fullName || 'Paciente',
      professionalId: selectedTherapistData.id,
      professionalName: selectedTherapistData.name,
      date: selectedDate,
      time: selectedTime,
      durationMinutes: selectedService === 'single' ? 50 : 50,
      status: 'confirmed',
      sessionType: selectedService === 'single' ? 'single' : selectedService === 'program4' ? 'program_4' : 'program_6',
      serviceName: selectedServiceData.name,
      videoLink: generateJitsiRoomName(appointmentId),
    })

    setConfirmed(true)
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
                <p className="text-text"><strong>Terapeuta:</strong> {selectedTherapistData?.name}</p>
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
                    <span className="text-xl font-bold text-primary-dark whitespace-nowrap">{service.price}</span>
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
              {therapists.map((therapist) => (
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
                    {therapist.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text">{therapist.name}</h3>
                    <p className="text-sm text-text-light">{therapist.specialty}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={14} className="text-warning fill-warning" />
                      <span className="text-sm text-text font-medium">{therapist.rating}</span>
                      <span className="text-sm text-text-light">({therapist.reviews} reseñas)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-text">{therapist.price}</span>
                    <span className="text-xs text-text-light">/sesión</span>
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
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <LabelWithIcon icon={Clock} text="Horario disponible" />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {timeSlots.map((time) => (
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
                <SummaryRow icon={User} label="Terapeuta" value={selectedTherapistData?.name || ''} />
                <SummaryRow icon={Calendar} label="Fecha" value={selectedDate} />
                <SummaryRow icon={Clock} label="Hora" value={selectedTime} />
                <SummaryRow icon={Video} label="Modalidad" value="Videollamada privada" />
              </div>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-[12px]">
                <span className="text-text">Total a pagar</span>
                <span className="text-xl font-bold text-primary-dark">{selectedServiceData.price}</span>
              </div>
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
            <Button onClick={handleConfirm} className="gap-2">
              <Check size={18} />
              Confirmar cita
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
