import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Headphones } from 'lucide-react'

export function AdminSupport() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Soporte</h1>
          <p className="text-text-light">Tickets y solicitudes de ayuda.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones size={20} className="text-primary" />
              Tickets abiertos
            </CardTitle>
            <CardDescription>Atiende las dudas de usuarios y profesionales.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-text-light">
              <Headphones size={48} className="mx-auto mb-4 text-muted" />
              <p>No hay tickets de soporte.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
