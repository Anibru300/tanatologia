import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import {
  Eye,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import {
  getProfessionalsWithDocuments,
  getDocumentsForProfessional,
  getSignedUrl,
  approveProfessional,
  rejectProfessional,
  setDocumentStatus,
  type ProfessionalWithDocuments,
  type ProfessionalDocument,
  type VerificationStatus,
} from '@/features/verification/verificationService'

const STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  verified: 'Verificado',
  rejected: 'Rechazado',
}

function statusVariant(status: VerificationStatus) {
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

export function AdminVerification() {
  const [professionals, setProfessionals] = useState<ProfessionalWithDocuments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all')

  const [selected, setSelected] = useState<ProfessionalWithDocuments | null>(null)
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [acting, setActing] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [docReject, setDocReject] = useState<ProfessionalDocument | null>(null)
  const [docRejectReason, setDocRejectReason] = useState('')
  const [preview, setPreview] = useState<{ doc: ProfessionalDocument; url: string } | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getProfessionalsWithDocuments()
      setProfessionals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openDetail(p: ProfessionalWithDocuments) {
    setSelected(p)
    setRejectReason('')
    setShowRejectForm(false)
    setDocuments([])
    setLoadingDocs(true)
    try {
      const docs = await getDocumentsForProfessional(p.id)
      setDocuments(docs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos')
    } finally {
      setLoadingDocs(false)
    }
  }

  function closeDetail() {
    setSelected(null)
    setDocuments([])
    setRejectReason('')
    setShowRejectForm(false)
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

  function isImageFile(name: string) {
    return /\.(png|jpe?g|webp|gif)$/i.test(name)
  }

  function isPdfFile(name: string) {
    return /\.pdf$/i.test(name)
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
      if (selected) {
        setDocuments(await getDocumentsForProfessional(selected.id))
      }
      setDocReject(null)
      setDocRejectReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el documento')
    } finally {
      setActing(false)
    }
  }

  async function handleApprove() {
    if (!selected) return
    setConfirmApprove(false)
    setError('')
    setSuccess('')
    setActing(true)
    try {
      await approveProfessional(selected.id)
      setSuccess(`${selected.full_name} fue verificado correctamente.`)
      closeDetail()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar al profesional')
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    if (!selected) return
    setError('')
    setSuccess('')
    setActing(true)
    try {
      await rejectProfessional(selected.id, rejectReason)
      setSuccess(`Se rechazó el expediente de ${selected.full_name}.`)
      closeDetail()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo rechazar al profesional')
    } finally {
      setActing(false)
    }
  }

  async function copyLicense(license?: string) {
    if (!license) return
    try {
      await navigator.clipboard.writeText(license)
      setSuccess('Número de cédula copiado al portapapeles.')
    } catch {
      setError('No se pudo copiar la cédula.')
    }
  }

  const filtered = professionals.filter((p) => statusFilter === 'all' || p.verification_status === statusFilter)

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Verificación de profesionales</h1>
            <p className="text-text-light">Revisa expedientes documentales y aprueba o rechaza perfiles.</p>
          </div>
          <div className="w-56">
            <Select
              label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | VerificationStatus)}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'in_review', label: 'En revisión' },
                { value: 'verified', label: 'Verificado' },
                { value: 'rejected', label: 'Rechazado' },
              ]}
            />
          </div>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && <Alert variant="success" autoDismiss={5000} onDismiss={() => setSuccess('')} className="mb-4">{success}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>Expedientes</CardTitle>
            <CardDescription>{filtered.length} profesionales</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              loading={loading}
              rows={filtered}
              keyOf={(p) => p.id}
              emptyMessage="No hay profesionales con este estado."
              caption="Expedientes de profesionales"
              columns={[
                {
                  header: 'Nombre',
                  render: (p) => (
                    <div>
                      <p className="font-medium text-text">{p.full_name}</p>
                      <p className="text-sm text-text-light">{p.email}</p>
                    </div>
                  ),
                },
                { header: 'Cédula', render: (p) => <span className="text-text">{p.license_number || '—'}</span> },
                {
                  header: 'Estado',
                  render: (p) => (
                    <Badge variant={statusVariant(p.verification_status)}>
                      {STATUS_LABELS[p.verification_status]}
                    </Badge>
                  ),
                },
                { header: 'Documentos', render: (p) => <span className="text-text-light">{p.documents_count}</span> },
                {
                  header: 'Acciones',
                  render: (p) => (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => openDetail(p)}>
                      <Eye size={16} />
                      Revisar
                    </Button>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalle */}
      <Modal open={selected !== null} onClose={closeDetail} title={selected?.full_name} className="max-w-3xl">
        {selected && (
          <>
            <p className="text-text-light text-sm mb-4 -mt-2">{selected.email}</p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-bg-alt rounded-sm p-4">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Estado</p>
                <Badge variant={statusVariant(selected.verification_status)}>
                  {STATUS_LABELS[selected.verification_status]}
                </Badge>
              </div>
              <div className="bg-bg-alt rounded-sm p-4">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Universidad</p>
                <p className="text-text text-sm">{selected.university || '—'}</p>
              </div>
            </div>

            {/* Validación de cédula contra SEP */}
            <div className="border border-border rounded-md p-4 mb-6">
              <p className="font-medium text-text mb-2">Validación de cédula profesional</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="bg-bg-alt rounded-xs px-3 py-1.5 text-sm text-text">
                  {selected.license_number || 'Sin cédula capturada'}
                </code>
                {selected.license_number && (
                  <Button size="sm" variant="ghost" className="gap-2" onClick={() => copyLicense(selected.license_number)}>
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
              <p className="text-xs text-text-light mt-2">
                Verifica manualmente que la cédula exista y coincida con el nombre del profesional antes de aprobar.
              </p>
            </div>

            {/* Documentos */}
            <div className="mb-6">
              <h3 className="font-semibold text-text mb-3">Documentos</h3>
              {loadingDocs ? (
                <p className="text-text-light text-sm">Cargando documentos...</p>
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

            {/* Acciones finales */}
            {selected.verification_status !== 'verified' && (
              <div className="border-t border-border pt-4 space-y-4">
                {showRejectForm ? (
                  <div className="space-y-3">
                    <Textarea
                      label="Motivo del rechazo (el profesional lo verá)"
                      placeholder="Ej. La cédula no coincide con el registro de la SEP."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="danger"
                        className="gap-2"
                        disabled={acting || !rejectReason.trim()}
                        onClick={handleReject}
                      >
                        <XCircle size={18} />
                        Confirmar rechazo
                      </Button>
                      <Button variant="ghost" onClick={() => setShowRejectForm(false)}>
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
          </>
        )}
      </Modal>

      {/* Confirmación de aprobación */}
      <ConfirmDialog
        open={confirmApprove}
        title="Aprobar profesional"
        loading={acting}
        message={
          selected
            ? `¿Aprobar a ${selected.full_name}? Quedará visible en el directorio público y podrá recibir reservas.`
            : ''
        }
        confirmLabel="Sí, aprobar"
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(false)}
      />

      {/* Vista previa de documento dentro del contexto de revisión */}
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
      <Modal
        open={docReject !== null}
        onClose={() => setDocReject(null)}
        title="Rechazar documento"
      >
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
    </div>
  )
}
