import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
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

        {error && <div className="mb-4 p-3 rounded-[12px] bg-error/10 text-error text-sm">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Solicitudes recibidas</CardTitle>
            <CardDescription>Responde por correo a cada solicitud.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-text-light">Cargando...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Solicitante</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Servicio</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Total</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id} className="border-b border-border last:border-0">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-text">{q.name}</p>
                            <p className="text-sm text-text-light">{q.email}</p>
                            {q.phone && <p className="text-xs text-muted">Tel: {q.phone}</p>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-text">{serviceLabels[q.service_type] || q.service_type}</td>
                        <td className="py-4 px-4 text-text">
                          {q.total_amount ? `$${(q.total_amount / 100).toLocaleString('es-MX')}` : '—'}
                        </td>
                        <td className="py-4 px-4 text-text-light">{new Date(q.created_at).toLocaleDateString('es-MX')}</td>
                        <td className="py-4 px-4">
                          <a
                            href={`mailto:${q.email}`}
                            className={cn(
                              'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-250 hover:-translate-y-0.5',
                              'bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white',
                              'px-4 py-2 text-sm'
                            )}
                          >
                            <Mail size={16} />
                            Responder
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
