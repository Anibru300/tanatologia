import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Search, CheckCircle, XCircle, FileText } from 'lucide-react'

const professionals = [
  { id: 1, name: 'Dra. María Rodríguez', email: 'maria@demo.com', specialty: 'Psicología clínica', status: 'pending' },
]

export function AdminProfessionals() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Profesionales</h1>
            <p className="text-text-light">Gestión y verificación de especialistas.</p>
          </div>
          <Input placeholder="Buscar profesional..." icon={<Search size={18} />} className="w-64 mt-4 md:mt-0" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de profesionales</CardTitle>
            <CardDescription>{professionals.length} registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Nombre</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Especialidad</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {professionals.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-text">{p.name}</p>
                          <p className="text-sm text-text-light">{p.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-text">{p.specialty}</td>
                      <td className="py-4 px-4"><Badge variant="warning">Pendiente</Badge></td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost"><FileText size={16} /></Button>
                          <Button size="sm" variant="ghost" className="text-success"><CheckCircle size={16} /></Button>
                          <Button size="sm" variant="ghost" className="text-error"><XCircle size={16} /></Button>
                        </div>
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
