import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AuditLog = {
  id: string
  action: string
  table_name: string | null
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

export function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const { data, error: err } = await supabase
          .from('audit_logs')
          .select('id, action, table_name, created_at, profiles(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(100)

        if (err) throw new Error(err.message)
        if (!cancelled) setLogs((data || []) as unknown as AuditLog[])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando la auditoría')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Auditoría</h1>
          <p className="text-text-light">Registro de eventos relevantes del sistema.</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} className="text-primary-dark" />
              Logs de actividad
            </CardTitle>
            <CardDescription>
              {loading ? 'Cargando...' : `${logs.length} eventos recientes.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              loading={loading}
              rows={logs}
              keyOf={(log) => log.id}
              emptyMessage="Aún no hay eventos registrados."
              caption="Logs de actividad del sistema"
              columns={[
                {
                  header: 'Usuario',
                  render: (log) => (
                    <span className="text-text">{log.profiles?.full_name || log.profiles?.email || 'Sistema'}</span>
                  ),
                },
                { header: 'Acción', render: (log) => <span className="text-text">{log.action}</span> },
                {
                  header: 'Tabla',
                  render: (log) =>
                    log.table_name ? <Badge variant="info">{log.table_name}</Badge> : <span className="text-muted">—</span>,
                },
                {
                  header: 'Fecha',
                  render: (log) => <span className="text-text-light">{formatDate(log.created_at)}</span>,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
