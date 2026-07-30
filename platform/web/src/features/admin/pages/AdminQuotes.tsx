import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Mail } from 'lucide-react'
import { LinkButton } from '@/components/ui/LinkButton'
import { DataTable } from '@/components/ui/DataTable'
import { getAdminQuotes, type AdminQuote } from '@/features/admin/adminService'

const serviceLabels: Record<string, string> = {
  aislada: 'Consulta aislada',
  salud_mental: 'Programa Salud Mental',
  duelo: 'Acompañamiento por duelo',
}

export function AdminQuotes() {
  const [quotes, setQuotes] = useState<AdminQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getAdminQuotes()
      setQuotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Cotizaciones</h1>
          <p className="text-text-light">Solicitudes de cotización enviadas desde la landing.</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>Solicitudes recibidas</CardTitle>
            <CardDescription>Responde por correo a cada solicitud.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              loading={loading}
              rows={quotes}
              keyOf={(q) => q.id}
              emptyMessage="No hay cotizaciones recibidas."
              caption="Solicitudes de cotización recibidas"
              columns={[
                {
                  header: 'Solicitante',
                  render: (q) => (
                    <div>
                      <p className="font-medium text-text">{q.name}</p>
                      <p className="text-sm text-text-light">{q.email}</p>
                      {q.phone && <p className="text-xs text-muted">Tel: {q.phone}</p>}
                    </div>
                  ),
                },
                {
                  header: 'Servicio',
                  render: (q) => <span className="text-text">{serviceLabels[q.service_type] || q.service_type}</span>,
                },
                {
                  header: 'Total',
                  render: (q) => (
                    <span className="text-text">
                      {q.total_amount
                        ? `${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(q.total_amount / 100)}`
                        : '—'}
                    </span>
                  ),
                },
                {
                  header: 'Fecha',
                  render: (q) => (
                    <span className="text-text-light">{new Date(q.created_at).toLocaleDateString('es-MX')}</span>
                  ),
                },
                {
                  header: 'Acciones',
                  render: (q) => (
                    <LinkButton variant="outline" size="sm" href={`mailto:${q.email}`}>
                      <Mail size={16} />
                      Responder
                    </LinkButton>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
