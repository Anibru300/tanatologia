import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Search, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
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
          <div className="relative w-64 mt-4 md:mt-0">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-[12px] bg-error/10 text-error text-sm">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Listado de pacientes</CardTitle>
            <CardDescription>{filtered.length} registrados</CardDescription>
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Teléfono</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Registro</th>
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
                        <td className="py-4 px-4 text-text">{p.phone || '—'}</td>
                        <td className="py-4 px-4 text-text-light">{new Date(p.created_at).toLocaleDateString('es-MX')}</td>
                        <td className="py-4 px-4">
                          <a
                            href={`mailto:${p.email}`}
                            className={cn(
                              'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-250 hover:-translate-y-0.5',
                              'bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white',
                              'px-4 py-2 text-sm'
                            )}
                          >
                            <Mail size={16} />
                            Contactar
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
