import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Clock, Video, Check } from 'lucide-react'

const timeSlots = ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00', '19:00']

export function BookAppointment() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState('single')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  const services = [
    { id: 'single', name: 'Consulta aislada', price: '$400', duration: '50 min' },
    { id: 'program4', name: 'Programa Salud Mental', price: '$1,600', duration: '4 sesiones' },
    { id: 'program6', name: 'Acompañamiento por duelo', price: '$2,200', duration: '6 sesiones' },
  ]

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Agendar cita</h1>
          <p className="text-text-light">Elige el servicio, la fecha y la hora que mejor te funcionen.</p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 1: Tipo de servicio</CardTitle>
              <CardDescription>¿Qué tipo de acompañamiento necesitas?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`p-4 rounded-[12px] border-2 cursor-pointer transition-all ${
                    selectedService === service.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-text">{service.name}</h3>
                      <p className="text-sm text-text-light">{service.duration}</p>
                    </div>
                    <span className="text-xl font-bold text-text">{service.price}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 2: Fecha y hora</CardTitle>
              <CardDescription>Selecciona cuando quieres tu sesión.</CardDescription>
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
                      className={`px-4 py-2 rounded-[12px] border text-sm font-medium transition-colors ${
                        selectedTime === time
                          ? 'bg-primary text-white border-primary'
                          : 'border-border text-text hover:border-primary'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                <Button onClick={() => setStep(3)}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 3: Confirmar</CardTitle>
              <CardDescription>Revisa los detalles de tu cita.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-bg-alt rounded-[12px] p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="text-success" size={20} />
                  <span className="text-text">
                    {services.find((s) => s.id === selectedService)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-primary" size={20} />
                  <span className="text-text">{selectedDate || 'Fecha por seleccionar'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-primary" size={20} />
                  <span className="text-text">{selectedTime || 'Horario por seleccionar'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Video className="text-primary" size={20} />
                  <span className="text-text">Videollamada privada</span>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
                <Button>Confirmar cita</Button>
              </div>
            </CardContent>
          </Card>
        )}
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
