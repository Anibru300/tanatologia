import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Heart, Target, Sparkles, Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import {
  getPatientProfileId,
  getAppointmentsForPatient,
  type Appointment,
} from '@/features/appointments/appointmentsService'
import { siteConfig } from '@/lib/siteConfig'

type ProgramProgress = {
  type: 'program_4' | 'program_6'
  name: string
  total: number
  completed: number
}

export function PatientPrograms() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const patientProfileId = await getPatientProfileId(userId)
        if (!patientProfileId) {
          throw new Error('No se encontró tu perfil de paciente.')
        }
        const data = await getAppointmentsForPatient(patientProfileId)
        if (!cancelled) setAppointments(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando tus programas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const programs = useMemo<ProgramProgress[]>(() => {
    const result: ProgramProgress[] = []
    const defs: Array<{ type: 'program_4' | 'program_6'; name: string; total: number }> = [
      { type: 'program_4', name: siteConfig.pricing.program4.label, total: siteConfig.pricing.program4.sessions },
      { type: 'program_6', name: siteConfig.pricing.program6.label, total: siteConfig.pricing.program6.sessions },
    ]
    for (const def of defs) {
      const ofType = appointments.filter((a) => a.session_type === def.type && a.status !== 'cancelled')
      if (ofType.length === 0) continue
      const completed = ofType.filter((a) => a.status === 'completed').length
      result.push({ ...def, completed })
    }
    return result
  }, [appointments])

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mis programas</h1>
          <p className="text-text-light">Avance de tus procesos terapéuticos.</p>
        </div>

        {loading && <p className="text-text-light">Cargando programas...</p>}
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {!loading && !error && (
          <div className="grid md:grid-cols-2 gap-6">
            {programs.map((p) => {
              const percent = Math.min(100, Math.round((p.completed / p.total) * 100))
              const done = p.completed >= p.total
              return (
                <Card key={p.type}>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                        {p.type === 'program_4' ? (
                          <Heart className="text-secondary-dark" size={20} />
                        ) : (
                          <Leaf className="text-secondary-dark" size={20} />
                        )}
                      </div>
                      <div>
                        <CardTitle>{p.name}</CardTitle>
                        <CardDescription>
                          {p.total} sesiones · {p.completed} completadas
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ProgressBar value={percent} />
                    <div className="flex items-center gap-2 mt-4 text-sm text-text-light">
                      <Sparkles size={16} className="text-warning-dark" />
                      <span>
                        {done
                          ? '¡Programa completado! Celebra tu avance.'
                          : percent >= 50
                            ? '¡Vas por la mitad, sigue así!'
                            : 'Cada sesión cuenta, vas avanzando.'}
                      </span>
                    </div>
                    {!done && (
                      <Link to="/paciente/agendar">
                        <Button className="w-full mt-6">Agendar siguiente sesión</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <Target size={48} className="mx-auto mb-4 text-muted" />
                <h3 className="font-semibold text-text mb-2">
                  {programs.length === 0 ? 'Aún no tienes un programa' : '¿Necesitas un programa nuevo?'}
                </h3>
                <p className="text-text-light text-sm mb-4">
                  Explora nuestros programas guiados de {siteConfig.pricing.program4.sessions} y{' '}
                  {siteConfig.pricing.program6.sessions} sesiones.
                </p>
                <Link to="/paciente/agendar">
                  <Button variant="outline">Ver programas disponibles</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
