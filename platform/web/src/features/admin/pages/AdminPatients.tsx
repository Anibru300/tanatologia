import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { LinkButton } from '@/components/ui/LinkButton'
import { DataTable } from '@/components/ui/DataTable'
import { Search, Mail } from 'lucide-react'
import { getAdminPatients, type AdminPatient } from '@/features/admin/adminService'

export function AdminPatients() {
  const [patients, setPatients] = useState<AdminPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

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
                    <LinkButton variant="outline" size="sm" href={`mailto:${p.email}`}>
                      <Mail size={16} />
                      Contactar
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
