import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Search, Mail } from 'lucide-react'

const patients = [
  { id: 1, name: 'Ana Martínez', email: 'ana@demo.com', sessions: 5, status: 'active' },
]

export function AdminPatients() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Pacientes</h1>
            <p className="text-text-light">Gestión de usuarios pacientes.</p>
          </div>
          <Input placeholder="Buscar paciente..." icon={<Search size={18} />} className="w-64 mt-4 md:mt-0" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de pacientes</CardTitle>
            <CardDescription>{patients.length} registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Nombre</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Sesiones</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-text">{p.name}</p>
                          <p className="text-sm text-text-light">{p.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-text">{p.sessions}</td>
                      <td className="py-4 px-4"><Badge variant="success">Activo</Badge></td>
                      <td className="py-4 px-4">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Mail size={16} />
                          Contactar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
