import { useCallback, useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { getProfessionalDetail, updateProfessionalVerification, type AdminProfessional, type AdminProfessionalDetail } from '@/features/admin/adminService'
import {
  approveProfessional,
  getDocumentsForProfessional,
  getSignedUrl,
  rejectProfessional,
  setDocumentStatus,
  type ProfessionalDocument,
} from '@/features/verification/verificationService'
import { formatMXN } from '@/lib/format'
import {
  BadgeCheck,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  ShieldCheck,
  Star,
  X,
  XCircle,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  verified: 'Verificado',
  rejected: 'Rechazado',
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'verified') return 'success'
  if (status === 'in_review') return 'warning'
  if (status === 'rejected') return 'error'
  return 'default'
}

const DOC_TYPE_LABELS: Record<ProfessionalDocument['document_type'], string> = {
  cedula: 'Cédula profesional',
  titulo: 'Título profesional',
  ine: 'INE',
  comprobante_domicilio: 'Comprobante de domicilio',
  constancia_fiscal: 'Constancia fiscal',
  otro: 'Otro',
}

const DOC_STATUS_LABELS: Record<ProfessionalDocument['status'], string> = {
  uploaded: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

function isImageFile(name: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(name)
}

function isPdfFile(name: string) {
  return /\.pdf$/i.test(name)
}

/** Dato de solo lectura en formato etiqueta/valor. */
function ReadOnlyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-alt rounded-sm p-3">
      <p className="text-xs text-muted uppercase tracking-wider mb-1">{label}</p>
      <div className="text-text text-sm font-medium whitespace-pre-line">{children ?? '—'}</div>
    </div>
  )
}

interface ProfessionalDetailModalProps {
  /** Profesional seleccionado en la tabla (fila de AdminProfessional); null = modal cerrado. */
  professional: AdminProfessional | null
  onClose: () => void
  /** Se llama tras cualquier cambio de visibilidad/verificación para refrescar la tabla. */
  onChanged: () => void
}

/**
 * Expediente completo del profesional desde el panel de admin.
 * TODO el perfil es de SOLO LECTURA: las únicas mutaciones son las acciones
 * propias del admin (visibilidad, aprobar/rechazar profesional o documentos).
 */
export function ProfessionalDetailModal({ professional, onClose, onChanged }: ProfessionalDetailModalProps) {
  const [detail, setDetail] = useState<AdminProfessionalDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [documents, setDocuments] = useState<ProfessionalDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  const [visibilityUpdating, setVisibilityUpdating] = useState(false)
  const [acting, setActing] = useState(false)

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const [docReject, setDocReject] = useState<ProfessionalDocument | null>(null)
  const [docRejectReason, setDocRejectReason] = useState('')
  const [preview, setPreview] = useState<{ doc: ProfessionalDocument; url: string } | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!professional) return
    setLoadingDetail(true)
    setError('')
    try {
      const [d, docs] = await Promise.all([
        getProfessionalDetail(professional.id),
        getDocumentsForProfessional(professional.id),
      ])
      setDetail(d)
      setDocuments(docs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el expediente')
    } finally {
      setLoadingDetail(false)
      setLoadingDocs(false)
    }
  }, [professional])

  useEffect(() => {
    if (professional) {
      setDetail(null)
      setDocuments([])
      setSuccess('')
      setError('')
      setShowRejectForm(false)
      setRejectReason('')
      setLoadingDocs(true)
      reload()
    }
  }, [professional, reload])

  function closeAll() {
    setPreview(null)
    setDocReject(null)
    setConfirmApprove(false)
    onClose()
  }

  async function handleVisibilityChange(visible: boolean) {
    if (!detail || visibilityUpdating) return
    setVisibilityUpdating(true)
    setError('')
    setSuccess('')
    try {
      await updateProfessionalVerification(detail.id, detail.verification_status, visible)
      setDetail({ ...detail, is_visible: visible })
      setSuccess(
        visible
          ? `${detail.full_name} ahora es visible en el directorio.`
          : `${detail.full_name} ya no es visible en el directorio.`
      )
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la visibilidad.')
    } finally {
      setVisibilityUpdating(false)
    }
  }

  async function handleViewDocument(doc: ProfessionalDocument) {
    setError('')
    setLoadingPreviewId(doc.id)
    try {
      const url = await getSignedUrl(doc.storage_path)
      setPreview({ doc, url })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el documento')
    } finally {
      setLoadingPreviewId(null)
    }
  }

  async function handleDocStatus(doc: ProfessionalDocument, status: 'approved' | 'rejected', reason?: string) {
    setError('')
    if (status === 'rejected' && !reason?.trim()) {
      setError('Debes indicar el motivo del rechazo del documento.')
      return
    }
    setActing(true)
    try {
      await setDocumentStatus(doc.id, status, reason)
      setDocuments(await getDocumentsForProfessional(detail!.id))
      setDocReject(null)
      setDocRejectReason('')
      setSuccess(`Documento ${status === 'approved' ? 'aprobado' : 'rechazado'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el documento')
    } finally {
      setActing(false)
    }
  }

  async function handleApprove() {
    if (!detail) return
    setConfirmApprove(false)
    setError('')
    setSuccess('')
    setActing(true)
    try {
      await approveProfessional(detail.id)
      setSuccess(`${detail.full_name} fue verificado correctamente.`)
      await reload()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar al profesional')
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    if (!detail) return
    setError('')
    setSuccess('')
    setActing(true)
    try {
      await rejectProfessional(detail.id, rejectReason)
      setShowRejectForm(false)
      setRejectReason('')
      setSuccess(`Se rechazó el expediente de ${detail.full_name}.`)
      await reload()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo rechazar al profesional')
    } finally {
      setActing(false)
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(`${label} copiado al portapapeles.`)
    } catch {
      setError(`No se pudo copiar ${label.toLowerCase()}.`)
    }
  }

  return (
    <>
      <Modal
        open={professional !== null}
        onClose={closeAll}
        title={detail?.full_name ?? professional?.full_name ?? 'Expediente'}
        className="max-w-3xl"
      >
        {loadingDetail || !detail ? (
          <div className="space-y-4" aria-busy="true">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <SkeletonCards count={3} />
            {error && <Alert variant="error">{error}</Alert>}
          </div>
        ) : (
          <>
            {/* Encabezado: identidad pública (lo que ve un paciente) */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Avatar src={detail.avatar_url} name={detail.full_name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-text-light text-sm">{detail.professional_title || 'Profesional'}</p>
                  {detail.verification_status === 'verified' && (
                    <Badge variant="success">
                      <BadgeCheck size={14} className="mr-1" />
                      Verificado
                    </Badge>
                  )}
                </div>
                {detail.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detail.specialties.map((s) => (
                      <Badge key={s} variant="default">{s}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-text-light">
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="text-warning fill-warning" />
                    {Number(detail.rating).toFixed(1)}
                  </span>
                  <span>{detail.session_price !== null ? formatMXN(detail.session_price) : 'Precio por definir'} · sesión de 60 min</span>
                </div>
              </div>
              <div className="w-32">
                <Select
                  label="Visible en directorio"
                  aria-label={`Visibilidad de ${detail.full_name} en el directorio`}
                  options={[
                    { value: 'true', label: 'Sí' },
                    { value: 'false', label: 'No' },
                  ]}
                  value={detail.is_visible ? 'true' : 'false'}
                  disabled={visibilityUpdating}
                  onChange={(e) => handleVisibilityChange(e.target.value === 'true')}
                />
              </div>
            </div>

            <div className="mb-4">
              <Badge variant={statusVariant(detail.verification_status)}>
                {STATUS_LABELS[detail.verification_status] ?? detail.verification_status}
              </Badge>
              {detail.rejection_reason && (
                <p className="text-xs text-error-dark mt-2">Motivo del rechazo anterior: {detail.rejection_reason}</p>
              )}
            </div>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            {success && <Alert variant="success" className="mb-4" onDismiss={() => setSuccess('')}>{success}</Alert>}

            {/* Datos de contacto (solo lectura) */}
            <div className="mb-6">
              <h3 className="font-semibold text-text mb-3">Datos de contacto</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <ReadOnlyField label="Correo">{detail.email}</ReadOnlyField>
                <ReadOnlyField label="Teléfono">
                  {detail.phone ? (
                    <span className="inline-flex items-center gap-2">
                      {detail.phone}
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => copyText(detail.phone!, 'Teléfono')}>
                        <Copy size={14} />
                        Copiar
                      </Button>
                    </span>
                  ) : (
                    'No proporcionado'
                  )}
                </ReadOnlyField>
                {detail.timezone && <ReadOnlyField label="Zona horaria">{detail.timezone}</ReadOnlyField>}
              </div>
            </div>

            {/* Perfil público (solo lectura: lo que ve un paciente) */}
            <div className="mb-6">
              <h3 className="font-semibold text-text mb-3">Perfil público</h3>
              <div className="space-y-3">
                {detail.bio && <ReadOnlyField label="Sobre mí">{detail.bio}</ReadOnlyField>}
                <div className="grid sm:grid-cols-2 gap-3">
                  {detail.approach && <ReadOnlyField label="Enfoque terapéutico">{detail.approach}</ReadOnlyField>}
                  <ReadOnlyField label="Formación">
                    {detail.education ?? detail.university ?? '—'}
                  </ReadOnlyField>
                  {detail.languages && detail.languages.length > 0 && (
                    <ReadOnlyField label="Idiomas">{detail.languages.join(', ')}</ReadOnlyField>
                  )}
                  {detail.years_experience != null && (
                    <ReadOnlyField label="Experiencia">{detail.years_experience} años</ReadOnlyField>
                  )}
                </div>

                {/* Validación de cédula contra SEP */}
                <div className="border border-border rounded-md p-4">
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">Cédula profesional</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <code className="bg-bg-alt rounded-xs px-3 py-1.5 text-sm text-text">
                      {detail.license_number || 'Sin cédula capturada'}
                    </code>
                    {detail.license_number && (
                      <Button size="sm" variant="ghost" className="gap-2" onClick={() => copyText(detail.license_number!, 'Cédula')}>
                        <Copy size={16} />
                        Copiar
                      </Button>
                    )}
                    <a
                      href="https://cedulaprofesional.sep.gob.mx/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Consultar en cedulaprofesional.sep.gob.mx
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Expediente documental */}
            <div className="mb-6">
              <h3 className="font-semibold text-text mb-3">Expediente documental</h3>
              {loadingDocs ? (
                <SkeletonCards count={2} />
              ) : documents.length === 0 ? (
                <p className="text-text-light text-sm">Este profesional aún no sube documentos.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id} className="border border-border rounded-sm p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-text-light shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text">{DOC_TYPE_LABELS[doc.document_type]}</p>
                            <p className="text-xs text-text-light truncate">{doc.file_name}</p>
                          </div>
                          <Badge
                            variant={
                              doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'error' : 'info'
                            }
                          >
                            {DOC_STATUS_LABELS[doc.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={loadingPreviewId === doc.id}
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye size={14} />
                            {loadingPreviewId === doc.id ? 'Abriendo...' : 'Ver'}
                          </Button>
                          {doc.status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-success-dark"
                              aria-label={`Aprobar ${DOC_TYPE_LABELS[doc.document_type]}`}
                              title="Aprobar documento"
                              disabled={acting}
                              onClick={() => handleDocStatus(doc, 'approved')}
                            >
                              <CheckCircle size={16} />
                            </Button>
                          )}
                          {doc.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-error-dark"
                              aria-label={`Rechazar ${DOC_TYPE_LABELS[doc.document_type]}`}
                              title="Rechazar documento"
                              disabled={acting}
                              onClick={() => {
                                setDocReject(doc)
                                setDocRejectReason('')
                              }}
                            >
                              <XCircle size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                      {doc.status === 'rejected' && doc.rejection_reason && (
                        <p className="text-xs text-error-dark mt-2">Motivo: {doc.rejection_reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Acciones sobre el profesional */}
            {detail.verification_status !== 'verified' && (
              <div className="border-t border-border pt-4">
                {showRejectForm ? (
                  <div className="space-y-3">
                    <Textarea
                      label="Motivo del rechazo (el profesional lo verá)"
                      placeholder="Ej. La cédula no coincide con el registro de la SEP."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="danger"
                        className="gap-2"
                        disabled={acting || !rejectReason.trim()}
                        onClick={handleReject}
                      >
                        <XCircle size={18} />
                        Confirmar rechazo
                      </Button>
                      <Button variant="ghost" onClick={() => setShowRejectForm(false)} disabled={acting}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button className="gap-2" disabled={acting} onClick={() => setConfirmApprove(true)}>
                      <ShieldCheck size={18} />
                      Aprobar profesional
                    </Button>
                    <Button variant="danger-outline" className="gap-2" disabled={acting} onClick={() => setShowRejectForm(true)}>
                      <XCircle size={18} />
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Botón de cierre explícito (además de la X del encabezado y clic fuera) */}
            <div className="flex justify-end border-t border-border pt-4 mt-4">
              <Button variant="outline" className="gap-2" onClick={closeAll}>
                <X size={16} />
                Cerrar
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Confirmación de aprobación */}
      <ConfirmDialog
        open={confirmApprove}
        title="Aprobar profesional"
        loading={acting}
        message={
          detail
            ? `¿Aprobar a ${detail.full_name}? Quedará visible en el directorio público y podrá recibir reservas.`
            : ''
        }
        confirmLabel="Sí, aprobar"
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(false)}
      />

      {/* Vista previa de documento */}
      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview ? DOC_TYPE_LABELS[preview.doc.document_type] : ''}
        className="max-w-4xl"
      >
        {preview && (
          <div>
            <p className="text-xs text-text-light mb-3 truncate">{preview.doc.file_name}</p>
            {isImageFile(preview.doc.file_name) ? (
              <img
                src={preview.url}
                alt={DOC_TYPE_LABELS[preview.doc.document_type]}
                className="w-full max-h-[65vh] object-contain rounded-sm bg-bg-alt"
                loading="lazy"
                decoding="async"
              />
            ) : isPdfFile(preview.doc.file_name) ? (
              <iframe
                src={preview.url}
                title={DOC_TYPE_LABELS[preview.doc.document_type]}
                className="w-full h-[65vh] rounded-sm border border-border bg-white"
              />
            ) : (
              <div className="p-8 text-center bg-bg-alt rounded-sm">
                <p className="text-text-light text-sm">
                  Este tipo de archivo no se puede previsualizar aquí. Ábrelo en una pestaña nueva para verlo.
                </p>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-dark hover:underline"
              >
                Abrir en pestaña nueva
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Motivo de rechazo de documento */}
      <Modal open={docReject !== null} onClose={() => setDocReject(null)} title="Rechazar documento">
        {docReject && (
          <div className="space-y-4">
            <p className="text-sm text-text-light">
              {DOC_TYPE_LABELS[docReject.document_type]} · {docReject.file_name}
            </p>
            <Textarea
              label="Motivo del rechazo (el profesional lo verá)"
              placeholder="Ej. El documento es ilegible, vuelve a subirlo."
              value={docRejectReason}
              onChange={(e) => setDocRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDocReject(null)} disabled={acting}>
                Volver
              </Button>
              <Button
                variant="danger"
                disabled={acting || !docRejectReason.trim()}
                onClick={() => handleDocStatus(docReject, 'rejected', docRejectReason)}
              >
                {acting ? 'Procesando...' : 'Confirmar rechazo'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
