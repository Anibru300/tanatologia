import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/DataTable'
import { Search, Mail, Send } from 'lucide-react'
import { getAdminPatients, type AdminPatient } from '@/features/admin/adminService'
import { supabase } from '@/lib/supabase'

export function AdminPatients() {
  const [patients, setPatients] = useState<AdminPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [contactTarget, setContactTarget] = useState<AdminPatient | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [contactError, setContactError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getAdminPatients()
      setPatients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  function openContact(p: AdminPatient) {
    setContactTarget(p)
    setSubject('')
    setMessage('')
    setContactError('')
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactTarget || !subject.trim() || !message.trim() || sending) return
    setSending(true)
    setContactError('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-contact', {
        body: { profile_id: contactTarget.profile_id, subject: subject.trim(), message: message.trim() },
      })
      if (invokeError) throw new Error(invokeError.message)
      if (!data?.ok) throw new Error(data?.error || 'No se pudo enviar el correo.')
      setNotice(`Correo enviado a ${data.sent_to ?? contactTarget.email}`)
      setContactTarget(null)
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'No se pudo enviar el correo.')
    } finally {
      setSending(false)
    }
  }

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Pacientes</h1>
            <p className="text-text-light">Gestión de usuarios pacientes.</p>
          </div>
          <div className="w-64 mt-4 md:mt-0">
            <Input
              placeholder="Buscar paciente..."
              icon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar pacientes"
            />
          </div>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {notice && (
          <Alert variant="success" className="mb-4" onDismiss={() => setNotice('')}>
            {notice}
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Listado de pacientes</CardTitle>
            <CardDescription>{filtered.length} registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              loading={loading}
              rows={filtered}
              keyOf={(p) => p.id}
              emptyMessage={search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay pacientes registrados.'}
              caption="Listado de pacientes registrados"
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
                { header: 'Teléfono', render: (p) => <span className="text-text">{p.phone || '—'}</span> },
                {
                  header: 'Registro',
                  render: (p) => (
                    <span className="text-text-light">{new Date(p.created_at).toLocaleDateString('es-MX')}</span>
                  ),
                },
                {
                  header: 'Acciones',
                  render: (p) => (
                    <Button variant="outline" size="sm" onClick={() => openContact(p)}>
                      <Mail size={16} />
                      Contactar
                    </Button>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Modal
          open={contactTarget !== null}
          onClose={() => setContactTarget(null)}
          title="Contactar paciente"
        >
          {contactTarget && (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <p className="text-sm text-text-light">
                Enviarás un correo a <strong className="text-text">{contactTarget.full_name}</strong>{' '}
                ({contactTarget.email}). También recibirá una notificación en la plataforma.
              </p>
              {contactError && <Alert variant="error">{contactError}</Alert>}
              <Input
                label="Asunto"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="Asunto del correo"
              />
              <Textarea
                label="Mensaje"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={5000}
                placeholder="Escribe el mensaje…"
              />
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setContactTarget(null)} disabled={sending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!subject.trim() || !message.trim() || sending}>
                  <Send size={16} className="mr-2" />
                  {sending ? 'Enviando…' : 'Enviar correo'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  )
}
