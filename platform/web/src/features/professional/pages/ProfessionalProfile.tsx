import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  getMyProfile,
  updateProfile,
  updateProfessionalProfile,
  uploadAvatar,
  VerificationStatus,
} from '@/features/profiles/profilesService'
import { AvatarUploader } from '@/features/profiles/AvatarUploader'
import { ChipMultiSelect } from '@/features/profiles/ChipMultiSelect'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'

const TITLE_OPTIONS = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'Lic.', label: 'Lic.' },
  { value: 'Psic.', label: 'Psic.' },
  { value: 'Mtro.', label: 'Mtro.' },
  { value: 'Mtra.', label: 'Mtra.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Dra.', label: 'Dra.' },
]

const SPECIALTY_OPTIONS = [
  'Tanatología',
  'Duelo',
  'Psicología clínica',
  'Ansiedad',
  'Depresión',
  'Trauma',
  'Terapia de pareja',
  'Terapia familiar',
  'Adicciones',
  'Psicología infantil y adolescentes',
  'EMDR',
  'Terapia cognitivo-conductual',
  'Acompañamiento en enfermedad terminal',
  'Cuidados paliativos',
]

const LANGUAGE_OPTIONS = ['Español', 'Inglés', 'Francés', 'Portugués', 'Italiano', 'Lengua de Señas Mexicana (LSM)']

const VERIFICATION_BADGES: Record<VerificationStatus, { variant: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
  pending: { variant: 'warning', label: 'Pendiente de verificación' },
  in_review: { variant: 'info', label: 'En revisión' },
  verified: { variant: 'success', label: 'Verificado' },
  rejected: { variant: 'error', label: 'Verificación rechazada' },
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export function ProfessionalProfile() {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [professionalTitle, setProfessionalTitle] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [university, setUniversity] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [approach, setApproach] = useState('')
  const [bio, setBio] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [yearsExperience, setYearsExperience] = useState('')
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending')

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (!user) return

    let mounted = true
    setIsLoading(true)

    getMyProfile(user.id)
      .then(({ profile, professionalProfile }) => {
        if (!mounted) return
        setFullName(profile.full_name || '')
        setEmail(profile.email || '')
        setPhone(profile.phone || '')
        setAvatarUrl(profile.avatar_url)
        if (professionalProfile) {
          setProfessionalTitle(professionalProfile.professional_title || '')
          setLicenseNumber(professionalProfile.license_number || '')
          setUniversity(professionalProfile.university || '')
          setSpecialties(professionalProfile.specialties || [])
          setApproach(professionalProfile.approach || '')
          setBio(professionalProfile.bio || '')
          setLanguages(professionalProfile.languages || [])
          setYearsExperience(
            professionalProfile.years_experience !== null ? String(professionalProfile.years_experience) : ''
          )
          setVerificationStatus(professionalProfile.verification_status || 'pending')
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

    const years = yearsExperience.trim() ? Number(yearsExperience) : null
    if (years !== null && (Number.isNaN(years) || years < 0)) {
      setSaveStatus('error')
      setSaveMessage('Los años de experiencia deben ser un número válido.')
      return
    }

    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      await updateProfessionalProfile(user.id, {
        full_name: fullName.trim(),
        professional_title: professionalTitle || null,
        license_number: licenseNumber.trim() || null,
        university: university.trim() || null,
        specialties,
        approach: approach.trim() || null,
        bio: bio.trim() || null,
        languages,
        years_experience: years,
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
          <div className="h-96 rounded-md bg-border/50 animate-pulse" />
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

  const badge = VERIFICATION_BADGES[verificationStatus]

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Mi perfil profesional</h1>
          <p className="text-text-light">Gestiona tu información pública y credenciales.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <AvatarUploader avatarUrl={avatarUrl} fullName={fullName} onUpload={handleAvatarUpload} />
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-text">
                  {professionalTitle ? `${professionalTitle} ` : ''}
                  {fullName || 'Tu nombre'}
                </h2>
                <p className="text-text-light">{specialties[0] || 'Profesional de la salud mental'}</p>
                <div className="mt-2">
                  <Badge variant={badge.variant}>
                    <ShieldCheck size={12} className="mr-1" />
                    {badge.label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información profesional</CardTitle>
            <CardDescription>Actualiza tus datos y especialidades.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <div>
                <Input label="Correo electrónico" value={email} disabled className="bg-bg-alt" />
                <p className="text-xs text-muted mt-1">El correo no se puede modificar.</p>
              </div>
              <Input
                label="Teléfono"
                placeholder="477 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Select
                label="Título profesional"
                options={TITLE_OPTIONS}
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
              <div>
                <Input
                  label="Cédula profesional"
                  placeholder="12345678"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
                <p className="text-xs text-muted mt-1">
                  Tu cédula se valida en la página de Verificación.
                </p>
              </div>
              <Input
                label="Universidad"
                placeholder="Ej. Universidad de Guanajuato"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
              />
            </div>

            <ChipMultiSelect label="Especialidades" options={SPECIALTY_OPTIONS} values={specialties} onChange={setSpecialties} />

            <Input
              label="Enfoque terapéutico"
              placeholder="Ej. Humanista, cognitivo-conductual, tanatológico"
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
            />

            <Textarea
              label="Biografía"
              rows={4}
              placeholder="Cuéntales a los pacientes quién eres y cómo trabajas."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />

            <ChipMultiSelect label="Idiomas" options={LANGUAGE_OPTIONS} values={languages} onChange={setLanguages} />

            <Input
              label="Años de experiencia"
              type="number"
              min={0}
              placeholder="Ej. 10"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Beta gratuita</CardTitle>
            <CardDescription>
              Durante la Beta de Somos Calma no se cobra nada a pacientes ni profesionales.
              Las tarifas se definirán en una fase posterior.
            </CardDescription>
          </CardHeader>
        </Card>

        {saveMessage && (
          <Alert variant={saveStatus === 'success' ? 'success' : 'error'} className="mb-4">
            {saveMessage}
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveStatus === 'saving' || !fullName.trim()}>
            {saveStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
            {saveStatus === 'saving' ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
