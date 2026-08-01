import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { CheckCircle } from 'lucide-react'

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Flujo token_hash (template de email personalizado): el enlace llega como
    // #/actualizar-contrasena?token_hash=...&type=recovery
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          setError('El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.')
        }
        setChecking(false)
      })
      return
    }
    // Fallback: Supabase extrae automáticamente el token de recuperación de la URL.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setError('El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.')
      }
      setChecking(false)
    })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-md mx-auto text-center">
          <p className="text-text-light">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-md mx-auto">
          <Card className="text-center">
            <CardContent className="p-12">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle size={40} className="text-success-dark" />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">Contraseña actualizada</h2>
              <p className="text-text-light">
                Tu contraseña se ha restablecido correctamente. Te redirigimos al inicio de sesión.
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
            <CardTitle>Nueva contraseña</CardTitle>
            <CardDescription>Elige una contraseña segura para tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  minLength={8}
                />
              </div>
              {error && <Alert variant="error" className="p-3 rounded-sm">{error}</Alert>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Actualizando...' : 'Guardar nueva contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
