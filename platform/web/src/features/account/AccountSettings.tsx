import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Mail, KeyRound, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'

interface AccountSettingsProps {
  profilePath?: string
  profileLabel?: string
}

export function AccountSettings({ profilePath, profileLabel }: AccountSettingsProps) {
  const { user } = useAuth()

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      // Limpieza best-effort de archivos propios en Storage (avatares y documentos)
      if (user?.id) {
        for (const bucket of ['avatars', 'professional-documents']) {
          const { data: objects } = await supabase.storage.from(bucket).list(user.id)
          if (objects?.length) {
            await supabase.storage.from(bucket).remove(objects.map((o) => `${user.id}/${o.name}`))
          }
        }
      }
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No pudimos eliminar tu cuenta. Intenta de nuevo.')
      setDeleteLoading(false)
    }
  }

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
          Administra tu correo de acceso y contraseña.
          {profilePath && profileLabel && (
            <>
              {' '}Tu perfil se edita desde{' '}
              <a href={profilePath} className="text-primary-dark hover:underline">
                {profileLabel}
              </a>
              .
            </>
          )}
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

      <Card className="border-error/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-error-dark">
            <Trash2 size={20} />
            Eliminar cuenta
          </CardTitle>
          <CardDescription>
            Esta acción es permanente: se borran tu perfil, tus citas, tus documentos y
            toda tu información. No se puede deshacer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteError && (
            <Alert variant="error" className="p-3 rounded-sm mb-4">
              {deleteError}
            </Alert>
          )}
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Eliminar mi cuenta
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar tu cuenta"
        destructive
        confirmLabel="Sí, eliminar mi cuenta"
        loading={deleteLoading}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        message={
          <>
            <p className="mb-2">
              Vas a eliminar permanentemente la cuenta <strong>{user?.email}</strong>.
            </p>
            <p>
              Se borrarán tu perfil, citas programadas, documentos e historial. Si tienes
              una sesión próxima, considera cancelarla primero para avisar a tu profesional.
            </p>
          </>
        }
      />
    </div>
  )
}
