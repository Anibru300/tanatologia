import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Search, CheckCircle, XCircle, FileText } from 'lucide-react'
import { getAdminProfessionals, updateProfessionalVerification, type AdminProfessional } from '@/features/admin/adminService'

export function AdminProfessionals() {
  const [professionals, setProfessionals] = useState<AdminProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getAdminProfessionals()
      setProfessionals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  async function verify(professional: AdminProfessional, status: 'verified' | 'rejected') {
    try {
      await updateProfessionalVerification(professional.id, status, status === 'verified')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  const filtered = professionals.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Profesionales</h1>
            <p className="text-text-light">Gestión y verificación de especialistas.</p>
          </div>
          <div className="relative w-64 mt-4 md:mt-0">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Buscar profesional..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-[12px] bg-error/10 text-error text-sm">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Listado de profesionales</CardTitle>
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Especialidad</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Visible</th>
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
                            {p.license_number && <p className="text-xs text-muted">Cédula: {p.license_number}</p>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-text">{p.specialties.join(', ') || '—'}</td>
                        <td className="py-4 px-4">
                          <Badge variant={p.verification_status === 'verified' ? 'success' : 'warning'}>
                            {p.verification_status === 'verified' ? 'Verificado' : 'Pendiente'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-text-light">{p.is_visible ? 'Sí' : 'No'}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost"><FileText size={16} /></Button>
                            {p.verification_status !== 'verified' && (
                              <Button size="sm" variant="ghost" className="text-success" onClick={() => verify(p, 'verified')}>
                                <CheckCircle size={16} />
                              </Button>
                            )}
                            {p.verification_status !== 'rejected' && (
                              <Button size="sm" variant="ghost" className="text-error" onClick={() => verify(p, 'rejected')}>
                                <XCircle size={16} />
                              </Button>
                            )}
                          </div>
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
