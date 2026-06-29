import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type UserRole } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { User, Stethoscope, ShieldCheck, CheckCircle } from 'lucide-react'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('patient')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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
    {
      value: 'admin',
      label: 'Administración',
      icon: ShieldCheck,
      description: 'Gestiono la plataforma',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await register(email, password, fullName, role)
      setSuccess(true)
      setTimeout(() => {
        navigate(role === 'patient' ? '/paciente' : role === 'professional' ? '/profesional' : '/admin')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-md mx-auto">
          <Card className="text-center">
            <CardContent className="p-12">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle size={40} className="text-success" />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">¡Cuenta creada!</h2>
              <p className="text-text-light">Te estamos redirigiendo a tu portal...</p>
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
                    className={`w-full flex items-center gap-4 p-4 rounded-[16px] border-2 text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-primary text-white' : 'bg-bg-alt text-text-light'
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
              {error && (
                <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
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
