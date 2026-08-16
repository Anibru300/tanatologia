import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Mail, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

export function ProfessionalSettings() {
  const { user } = useAuth()

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailMessage(null)

    const email = newEmail.trim()
    if (!email || email === user?.email) {
      setEmailMessage({ type: 'error', text: 'Escribe un correo distinto al actual.' })
      return
    }

    setEmailLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      setEmailMessage({
        type: 'success',
        text: 'Te enviamos un enlace de confirmación al nuevo correo. El cambio se aplica cuando lo confirmes.',
      })
      setNewEmail('')
    } catch (err) {
      setEmailMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No pudimos actualizar tu correo. Intenta de nuevo.',
      })
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' })
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No pudimos actualizar tu contraseña. Intenta de nuevo.',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Configuración de cuenta</h1>
        <p className="text-text-light mt-1">
          Administra tu correo de acceso y contraseña. Tu perfil profesional se edita desde{' '}
          <a href="/app/#/profesional/perfil" className="text-primary-dark hover:underline">
            Mi perfil
          </a>
          .
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail size={20} className="text-primary-dark" />
            Correo electrónico
          </CardTitle>
          <CardDescription>
            Tu correo actual es <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <Label>Nuevo correo electrónico</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nuevo@ejemplo.com"
                required
              />
            </div>
            {emailMessage && (
              <Alert variant={emailMessage.type} className="p-3 rounded-sm">
                {emailMessage.text}
              </Alert>
            )}
            <Button type="submit" disabled={emailLoading}>
              {emailLoading ? 'Actualizando...' : 'Actualizar correo'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={20} className="text-primary-dark" />
            Contraseña
          </CardTitle>
          <CardDescription>Usa al menos 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                placeholder="Repite la contraseña"
                required
                minLength={8}
              />
            </div>
            {passwordMessage && (
              <Alert variant={passwordMessage.type} className="p-3 rounded-sm">
                {passwordMessage.text}
              </Alert>
            )}
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
