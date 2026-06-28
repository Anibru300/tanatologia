import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, DollarSign, TrendingUp, CreditCard } from 'lucide-react'

export function AdminFinances() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Finanzas</h1>
            <p className="text-text-light">Ingresos, comisiones y retenciones.</p>
          </div>
          <Button variant="outline" className="gap-2 mt-4 md:mt-0">
            <Download size={18} />
            Exportar reporte
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign size={20} className="text-primary" />
                Ingresos totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$600</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Comisiones retenidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$60</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Pagos a profesionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-text">$540</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen mensual</CardTitle>
            <CardDescription>Movimientos de junio 2026.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-around gap-2">
              {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((m, i) => (
                <div key={m} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className="w-full bg-primary/20 rounded-t-[8px]"
                    style={{ height: `${(i + 1) * 12}%` }}
                  />
                  <span className="text-xs text-text-light">{m}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
