import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Mail, CheckCircle } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // El index.html mueve los query params de recovery al hash del HashRouter.
        redirectTo: `${window.location.origin}/tanatologia/app/`,
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-md mx-auto">
          <Card className="text-center">
            <CardContent className="p-12">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle size={40} className="text-success" />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">Revisa tu correo</h2>
              <p className="text-text-light">
                Si la dirección <strong>{email}</strong> está registrada, recibirás un enlace para restablecer tu contraseña.
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
            <CardTitle>Recuperar contraseña</CardTitle>
            <CardDescription>
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Correo electrónico</Label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hola@ejemplo.com"
                    className="pl-11"
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-[12px] bg-error/10 text-error text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-text-light">
              ¿Recuerdas tu contraseña?{' '}
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
