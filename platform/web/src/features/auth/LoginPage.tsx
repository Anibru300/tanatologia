import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, type UserRole } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { User, Stethoscope, ShieldCheck } from 'lucide-react'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const defaultRole = (searchParams.get('role') as UserRole) || 'patient'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(defaultRole)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password, role)
      navigate(role === 'patient' ? '/paciente' : role === 'professional' ? '/profesional' : '/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const roles: { value: UserRole; label: string; icon: React.ElementType }[] = [
    { value: 'patient', label: 'Paciente', icon: User },
    { value: 'professional', label: 'Profesional', icon: Stethoscope },
    { value: 'admin', label: 'Administración', icon: ShieldCheck },
  ]

  return (
    <div className="section-calma">
      <div className="container-calma max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              Selecciona tu tipo de cuenta e ingresa tus datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {roles.map((r) => {
                const Icon = r.icon
                const isActive = role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-[16px] border-2 transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary-dark'
                        : 'border-border bg-surface text-text-light hover:bg-bg-alt'
                    }`}
                  >
                    <Icon size={24} />
                    <span className="text-xs font-medium">{r.label}</span>
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && (
                <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Iniciando sesión...' : `Iniciar sesión como ${roles.find(r => r.value === role)?.label.toLowerCase()}`}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-text-light">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Regístrate
              </Link>
            </div>

            <div className="mt-4 p-3 rounded-[12px] bg-bg-alt text-xs text-text-light">
              <strong>Cuentas demo:</strong><br />
              paciente@demo.com / demo123<br />
              profesional@demo.com / demo123<br />
              admin@demo.com / demo123
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
