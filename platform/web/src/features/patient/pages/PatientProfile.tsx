import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getMyProfile,
  updateProfile,
  updatePatientProfile,
  uploadAvatar,
} from '@/features/profiles/profilesService'
import { AvatarUploader } from '@/features/profiles/AvatarUploader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { User, Mail, Phone, Calendar, Heart, AlertCircle, Loader2 } from 'lucide-react'

const GENDER_OPTIONS = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'no_binario', label: 'No binario' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
]

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export function PatientProfile() {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelationship, setEmergencyRelationship] = useState('')
  const [reasonForVisit, setReasonForVisit] = useState('')

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (!user) return

    let mounted = true
    setIsLoading(true)

    getMyProfile(user.id)
      .then(({ profile, patientProfile }) => {
        if (!mounted) return
        setFullName(profile.full_name || '')
        setEmail(profile.email || '')
        setPhone(profile.phone || '')
        setAvatarUrl(profile.avatar_url)
        if (patientProfile) {
          setBirthDate(patientProfile.birth_date || '')
          setGender(patientProfile.gender || '')
          setEmergencyName(patientProfile.emergency_contact_name || '')
          setEmergencyPhone(patientProfile.emergency_contact_phone || '')
          setEmergencyRelationship(patientProfile.emergency_contact_relationship || '')
          setReasonForVisit(patientProfile.reason_for_visit || '')
        }
      })
      .catch((err) => {
        if (!mounted) return
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar tu perfil.')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [user])

  const handleAvatarUpload = async (file: File) => {
    if (!user) return
    const url = await uploadAvatar(user.id, file)
    setAvatarUrl(url)
  }

  const handleSave = async () => {
    if (!user) return
    setSaveStatus('saving')
    setSaveMessage('')

    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      await updatePatientProfile(user.id, {
        full_name: fullName.trim(),
        birth_date: birthDate || null,
        gender: gender || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        emergency_contact_relationship: emergencyRelationship.trim() || null,
        reason_for_visit: reasonForVisit.trim() || null,
      })
      setSaveStatus('success')
      setSaveMessage('Tus cambios se guardaron correctamente.')
    } catch (err) {
      setSaveStatus('error')
      setSaveMessage(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    }
  }

  if (isLoading) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-3xl space-y-6">
          <div className="h-10 w-64 rounded-sm bg-border/50 animate-pulse" />
          <div className="h-40 rounded-md bg-border/50 animate-pulse" />
          <div className="h-64 rounded-md bg-border/50 animate-pulse" />
          <div className="h-48 rounded-md bg-border/50 animate-pulse" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="section-calma">
        <div className="container-calma max-w-3xl">
          <Card>
            <CardContent className="p-6 flex items-center gap-3 text-error-dark">
              <AlertCircle size={20} />
              <p>{loadError}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mi perfil</h1>
          <p className="text-text-light">Administra tu información personal y de contacto.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <AvatarUploader avatarUrl={avatarUrl} fullName={fullName} onUpload={handleAvatarUpload} />
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-text">{fullName || 'Tu nombre'}</h2>
                <p className="text-text-light">Paciente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} className="text-primary" />
              Información básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-sm border border-border bg-bg-alt text-text">
                  <Mail size={18} className="text-muted" />
                  {email}
                </div>
                <p className="text-xs text-muted mt-1">El correo no se puede modificar.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Teléfono</Label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    className="pl-11"
                    placeholder="477 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Fecha de nacimiento</Label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    type="date"
                    className="pl-11"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Género"
                options={GENDER_OPTIONS}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart size={20} className="text-primary" />
              Contacto de emergencia
            </CardTitle>
            <CardDescription>Alguien a quien podamos contactar si es necesario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  placeholder="Nombre completo"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  placeholder="477 123 4567"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>Parentesco</Label>
                <Input
                  placeholder="Ej. Cónyuge, hermano/a"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Motivo de consulta</CardTitle>
            <CardDescription>Cuéntanos brevemente qué te trae a SOMOS CALMA.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              placeholder="Escribe aquí..."
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
            />
          </CardContent>
        </Card>

        {saveMessage && (
          <Alert variant={saveStatus === 'success' ? 'success' : 'error'} className="mb-4">
            {saveMessage}
          </Alert>
        )}

        <div className="flex justify-end gap-4">
          <Button onClick={handleSave} disabled={saveStatus === 'saving' || !fullName.trim()}>
            {saveStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
            {saveStatus === 'saving' ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
