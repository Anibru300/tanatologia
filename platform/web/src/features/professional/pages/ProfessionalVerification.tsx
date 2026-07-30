import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Trash2,
  ShieldCheck,
  Send,
} from 'lucide-react'
import {
  getMyProfessionalProfile,
  getMyDocuments,
  uploadDocument,
  deleteDocument,
  updateLicenseNumber,
  submitForReview,
  type DocumentType,
  type ProfessionalDocument,
  type VerificationStatus,
  type MyProfessionalProfile,
} from '@/features/verification/verificationService'

const DOCUMENT_TYPES: { type: DocumentType; label: string; required: boolean; hint: string }[] = [
  { type: 'cedula', label: 'Cédula profesional', required: true, hint: 'Documento emitido por la SEP.' },
  { type: 'titulo', label: 'Título profesional', required: true, hint: 'Título de licenciatura o posgrado.' },
  { type: 'ine', label: 'Identificación oficial (INE)', required: true, hint: 'Vigente, legible.' },
  { type: 'comprobante_domicilio', label: 'Comprobante de domicilio', required: false, hint: 'No mayor a 3 meses.' },
  { type: 'constancia_fiscal', label: 'Constancia de situación fiscal', required: false, hint: 'Opcional, para facturación.' },
]

const STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  verified: 'Verificado',
  rejected: 'Requiere cambios',
}

const DOC_STATUS_LABELS: Record<ProfessionalDocument['status'], string> = {
  uploaded: 'Subido',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

function docStatusVariant(status: ProfessionalDocument['status']) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'
  return 'info'
}

export function ProfessionalVerification() {
  const [profile, setProfile] = useState<MyProfessionalProfile | null>(null)
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<ProfessionalDocument | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [licenseNumber, setLicenseNumber] = useState('')
  const [savingLicense, setSavingLicense] = useState(false)
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputs = useRef<Partial<Record<DocumentType, HTMLInputElement | null>>>({})

  const load = useCallback(async () => {
    try {
      const [p, docs] = await Promise.all([getMyProfessionalProfile(), getMyDocuments()])
      setProfile(p)
      setDocuments(docs)
      setLicenseNumber(p.license_number || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tu información')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const status: VerificationStatus = profile?.verification_status || 'pending'
  const canEdit = status === 'pending' || status === 'rejected'

  const docsByType = (type: DocumentType) => documents.filter((d) => d.document_type === type)

  const missing: string[] = []
  if (!licenseNumber.trim() || licenseNumber.trim().length < 4) {
    missing.push('Captura tu número de cédula profesional')
  }
  for (const dt of DOCUMENT_TYPES.filter((d) => d.required)) {
    if (docsByType(dt.type).length === 0) {
      missing.push(`Sube tu ${dt.label.toLowerCase()}`)
    }
  }

  async function handleSaveLicense() {
    setError('')
    setSuccess('')
    setSavingLicense(true)
    try {
      await updateLicenseNumber(licenseNumber)
      setSuccess('Número de cédula guardado correctamente.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cédula')
    } finally {
      setSavingLicense(false)
    }
  }

  async function handleFileSelected(type: DocumentType, file: File | undefined) {
    if (!file) return
    setError('')
    setSuccess('')
    setUploadingType(type)
    try {
      await uploadDocument(file, type)
      setSuccess('Documento subido correctamente.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento')
    } finally {
      setUploadingType(null)
      const input = fileInputs.current[type]
      if (input) input.value = ''
    }
  }

  async function handleDelete(doc: ProfessionalDocument) {
    setError('')
    setSuccess('')
    setDeleting(true)
    try {
      await deleteDocument(doc.id, doc.storage_path)
      setSuccess('Documento eliminado.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await submitForReview()
      setSuccess('¡Expediente enviado! El equipo de SOMOS-CALMA lo revisará en 24-48 horas.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar a revisión')
    } finally {
      setSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const steps = [
    { key: 'pending', label: 'Expediente', done: status !== 'pending' || missing.length === 0 },
    { key: 'in_review', label: 'En revisión', done: status === 'in_review' || status === 'verified' },
    { key: 'verified', label: 'Verificado', done: status === 'verified' },
  ]

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Verificación profesional</h1>
          <p className="text-text-light">Sube tus documentos para aparecer en el directorio.</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && (
          <Alert variant="success" className="mb-4" autoDismiss={6000} onDismiss={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {loading ? (
          <p className="text-text-light">Cargando...</p>
        ) : (
          <>
            {/* Estado actual y línea de tiempo */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  {status === 'verified' ? (
                    <ShieldCheck className="text-success shrink-0" size={32} />
                  ) : status === 'rejected' ? (
                    <XCircle className="text-error shrink-0" size={32} />
                  ) : status === 'in_review' ? (
                    <Clock className="text-warning shrink-0" size={32} />
                  ) : (
                    <FileText className="text-primary shrink-0" size={32} />
                  )}
                  <div>
                    <h3 className="font-semibold text-text">Estado: {STATUS_LABELS[status]}</h3>
                    <p className="text-text-light text-sm">
                      {status === 'verified' && 'Tu perfil está verificado y visible en el directorio.'}
                      {status === 'in_review' && 'El equipo de SOMOS-CALMA validará tus documentos en 24-48 horas.'}
                      {status === 'pending' && 'Completa tu expediente y envíalo a revisión.'}
                      {status === 'rejected' && 'Corrige los puntos señalados y vuelve a enviar tu expediente.'}
                    </p>
                  </div>
                </div>

                {status === 'rejected' && profile?.rejection_reason && (
                  <Alert variant="error" className="mb-6">
                    <strong>Motivo del rechazo:</strong> {profile.rejection_reason}
                  </Alert>
                )}

                <div className="flex items-center">
                  {steps.map((step, i) => (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            step.done ? 'bg-primary-dark text-white' : 'bg-bg-alt text-muted'
                          }`}
                        >
                          {step.done ? <CheckCircle size={16} /> : i + 1}
                        </div>
                        <span className="text-xs text-text-light mt-1 whitespace-nowrap">{step.label}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 mb-5 ${steps[i + 1].done ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cédula profesional */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Cédula profesional</CardTitle>
                <CardDescription>Tu número de cédula se valida contra el registro de la SEP.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <Input
                      label="Número de cédula"
                      placeholder="Ej. 12345678"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSaveLicense}
                    disabled={!canEdit || savingLicense || !licenseNumber.trim()}
                  >
                    {savingLicense ? 'Guardando...' : 'Guardar cédula'}
                  </Button>
                </div>
                {!canEdit && (
                  <p className="text-xs text-muted mt-2">
                    No puedes modificar la cédula mientras tu expediente está {STATUS_LABELS[status].toLowerCase()}.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>
                  Formatos permitidos: JPG, PNG, WebP o PDF. Tamaño máximo: 10 MB. La información es confidencial
                  y solo se usa para validación.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {DOCUMENT_TYPES.map((dt) => {
                  const docs = docsByType(dt.type)
                  return (
                    <div key={dt.type} className="border border-border rounded-md p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="font-medium text-text">
                            {dt.label}
                            {dt.required && <span className="text-error-dark"> *</span>}
                          </p>
                          <p className="text-sm text-text-light">{dt.hint}</p>
                        </div>
                        <div>
                          <input
                            ref={(el) => {
                              fileInputs.current[dt.type] = el
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileSelected(dt.type, e.target.files?.[0])}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            disabled={status === 'verified' || uploadingType !== null}
                            onClick={() => fileInputs.current[dt.type]?.click()}
                          >
                            <Upload size={16} />
                            {uploadingType === dt.type ? 'Subiendo...' : 'Subir'}
                          </Button>
                        </div>
                      </div>

                      {docs.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {docs.map((doc) => (
                            <li
                              key={doc.id}
                              className="flex items-center justify-between gap-3 bg-bg-alt rounded-sm px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-text-light shrink-0" />
                                <span className="text-sm text-text truncate">{doc.file_name}</span>
                                <Badge variant={docStatusVariant(doc.status)}>
                                  {DOC_STATUS_LABELS[doc.status]}
                                </Badge>
                              </div>
                              {doc.status === 'uploaded' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-error-dark shrink-0"
                                  aria-label={`Eliminar ${doc.file_name}`}
                                  title="Eliminar documento"
                                  onClick={() => setConfirmDelete(doc)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </li>
                          ))}
                          {docs.some((d) => d.status === 'rejected' && d.rejection_reason) && (
                            <li className="text-xs text-error-dark px-1 list-none">
                              {docs
                                .filter((d) => d.status === 'rejected' && d.rejection_reason)
                                .map((d) => `Motivo: ${d.rejection_reason}`)
                                .join(' · ')}
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Enviar a revisión */}
            <Card>
              <CardContent className="p-6">
                {canEdit && missing.length > 0 && (
                  <div className="mb-4 p-3 rounded-sm bg-warning/10 text-sm text-text">
                    <p className="font-medium mb-1">Para enviar a revisión te falta:</p>
                    <ul className="list-disc list-inside text-text-light space-y-0.5">
                      {missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  className="gap-2 w-full sm:w-auto"
                  disabled={!canEdit || submitting || missing.length > 0}
                  onClick={handleSubmit}
                >
                  <Send size={18} />
                  {submitting ? 'Enviando...' : 'Enviar a revisión'}
                </Button>
                {status === 'in_review' && (
                  <p className="text-sm text-text-light mt-3">
                    Tu expediente ya está en revisión. Te notificaremos el resultado.
                  </p>
                )}
                {status === 'verified' && (
                  <p className="text-sm text-text-light mt-3">Tu perfil ya está verificado.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <ConfirmDialog
          open={confirmDelete !== null}
          title="Eliminar documento"
          destructive
          loading={deleting}
          message={
            confirmDelete
              ? `¿Eliminar "${confirmDelete.file_name}"? Tendrás que subirlo de nuevo si lo necesitas para tu verificación.`
              : ''
          }
          confirmLabel="Sí, eliminar"
          onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      </div>
    </div>
  )
}
