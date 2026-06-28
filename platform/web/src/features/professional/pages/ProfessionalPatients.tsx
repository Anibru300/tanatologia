import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, FileText } from 'lucide-react'

const patients = [
  { id: 1, name: 'Ana Martínez', email: 'ana@demo.com', age: 34, sessions: 5, status: 'active' },
  { id: 2, name: 'Luis Hernández', email: 'luis@demo.com', age: 41, sessions: 2, status: 'active' },
]

export function ProfessionalPatients() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Pacientes</h1>
            <p className="text-text-light">Listado de pacientes asignados.</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Input placeholder="Buscar paciente..." icon={<Search size={18} />} className="w-64" />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Nombre</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-light">Edad</th>
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
                      <td className="py-4 px-4 text-text">{p.age} años</td>
                      <td className="py-4 px-4 text-text">{p.sessions}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          Activo
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Button variant="outline" size="sm" className="gap-1">
                          <FileText size={16} />
                          Expediente
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
