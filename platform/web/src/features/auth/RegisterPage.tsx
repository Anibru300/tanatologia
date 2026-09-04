import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { type UserRole } from '@/features/auth/types'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { User, Stethoscope, CheckCircle } from 'lucide-react'

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const initialRole: UserRole = searchParams.get('role') === 'professional' ? 'professional' : 'patient'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>(initialRole)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const roles: { value: UserRole; label: string; icon: React.ElementType; description: string }[] = [
    {
      value: 'patient',
      label: 'Paciente',
      icon: User,
      description: 'Busco apoyo emocional o acompañamiento',
    },
    {
      value: 'professional',
      label: 'Profesional',
      icon: Stethoscope,
      description: 'Soy psicólogo, tanatólogo o especialista',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!acceptedTerms) {
      setError('Debes aceptar el Aviso de Privacidad y los Términos y Condiciones para continuar.')
      return
    }

    setIsLoading(true)
    try {
      await register(email, password, fullName, role)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSuccess(true)
        setTimeout(() => {
          navigate(role === 'patient' ? '/paciente/encuesta' : '/profesional')
        }, 1500)
      } else {
        setNeedsConfirmation(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setIsLoading(false)
    }
  }

  if (success || needsConfirmation) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-md mx-auto">
          <Card className="text-center">
            <CardContent className="p-12">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle size={40} className="text-success-dark" />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">
                {needsConfirmation ? 'Revisa tu correo' : '¡Cuenta creada!'}
              </h2>
              <p className="text-text-light">
                {needsConfirmation
                  ? 'Te enviamos un enlace de confirmación. Una vez confirmes, podrás iniciar sesión.'
                  : 'Te estamos redirigiendo a tu portal...'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Crear cuenta</CardTitle>
            <CardDescription>
              Selecciona tu tipo de cuenta y completa tus datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {roles.map((r) => {
                const Icon = r.icon
                const isActive = role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-md border-2 text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-primary-dark text-white' : 'bg-bg-alt text-text-light'
                      }`}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <p className={`font-semibold ${isActive ? 'text-text' : 'text-text-light'}`}>
                        {r.label}
                      </p>
                      <p className="text-sm text-text-light">{r.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre completo</Label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hola@ejemplo.com"
                  required
                />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
              {error && <Alert variant="error" className="p-3 rounded-sm">{error}</Alert>}
              <label className="flex items-start gap-3 text-sm text-text-light cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  required
                />
                <span>
                  He leído y acepto el{' '}
                  <a
                    href="/pages/aviso-privacidad.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Aviso de Privacidad
                  </a>{' '}
                  y los{' '}
                  <a
                    href="/pages/terminos.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Términos y Condiciones
                  </a>
                  .
                </span>
              </label>

              <Button type="submit" className="w-full" disabled={isLoading || !acceptedTerms}>
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-text-light">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Inicia sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
