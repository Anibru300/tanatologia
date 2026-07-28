import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  Eye,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  FileText,
  ShieldCheck,
  X,
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
    try {
      const url = await getSignedUrl(doc.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el documento')
    }
  }

  async function handleDocStatus(doc: ProfessionalDocument, status: 'approved' | 'rejected') {
    setError('')
    let reason: string | undefined
    if (status === 'rejected') {
      const input = window.prompt('Motivo del rechazo del documento:')
      if (input === null) return
      reason = input
      if (!reason.trim()) {
        setError('Debes indicar el motivo del rechazo del documento.')
        return
      }
    }
    setActing(true)
    try {
      await setDocumentStatus(doc.id, status, reason)
      if (selected) {
        setDocuments(await getDocumentsForProfessional(selected.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el documento')
    } finally {
      setActing(false)
    }
  }

  async function handleApprove() {
    if (!selected) return
    if (!window.confirm(`¿Aprobar a ${selected.full_name}? Quedará visible en el directorio.`)) return
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

        {error && <div className="mb-4 p-3 rounded-[12px] bg-error/10 text-error text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-[12px] bg-success/10 text-success text-sm">{success}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Expedientes</CardTitle>
            <CardDescription>{filtered.length} profesionales</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-text-light">Cargando...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Nombre</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Cédula</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Documentos</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-text">{p.full_name}</p>
                            <p className="text-sm text-text-light">{p.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-text">{p.license_number || '—'}</td>
                        <td className="py-4 px-4">
                          <Badge variant={statusVariant(p.verification_status)}>
                            {STATUS_LABELS[p.verification_status]}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-text-light">{p.documents_count}</td>
                        <td className="py-4 px-4">
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => openDetail(p)}>
                            <Eye size={16} />
                            Revisar
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-light">
                          No hay profesionales con este estado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
          <div className="relative bg-surface rounded-[20px] shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-text">{selected.full_name}</h2>
                <p className="text-text-light text-sm">{selected.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeDetail}>
                <X size={20} />
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-bg-alt rounded-[12px] p-4">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Estado</p>
                <Badge variant={statusVariant(selected.verification_status)}>
                  {STATUS_LABELS[selected.verification_status]}
                </Badge>
              </div>
              <div className="bg-bg-alt rounded-[12px] p-4">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Universidad</p>
                <p className="text-text text-sm">{selected.university || '—'}</p>
              </div>
            </div>

            {/* Validación de cédula contra SEP */}
            <div className="border border-border rounded-[16px] p-4 mb-6">
              <p className="font-medium text-text mb-2">Validación de cédula profesional</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="bg-bg-alt rounded-[8px] px-3 py-1.5 text-sm text-text">
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
                    <li key={doc.id} className="border border-border rounded-[12px] p-3">
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
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => handleViewDocument(doc)}>
                            <Eye size={14} />
                            Ver
                          </Button>
                          {doc.status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-success"
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
                              className="text-error"
                              disabled={acting}
                              onClick={() => handleDocStatus(doc, 'rejected')}
                            >
                              <XCircle size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                      {doc.status === 'rejected' && doc.rejection_reason && (
                        <p className="text-xs text-error mt-2">Motivo: {doc.rejection_reason}</p>
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
                        className="gap-2 bg-error hover:bg-error/90"
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
                    <Button className="gap-2" disabled={acting} onClick={handleApprove}>
                      <ShieldCheck size={18} />
                      Aprobar profesional
                    </Button>
                    <Button variant="outline" className="gap-2 text-error border-error" disabled={acting} onClick={() => setShowRejectForm(true)}>
                      <XCircle size={18} />
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
