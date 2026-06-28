import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Crown, Check } from 'lucide-react'

const plans = [
  { name: 'Básico', price: 'Gratis', features: ['Perfil público', '5 citas/mes', 'Soporte por correo'] },
  { name: 'Profesional', price: '$299/mes', features: ['Perfil destacado', 'Citas ilimitadas', 'Estadísticas', 'Soporte prioritario'], recommended: true },
]

export function ProfessionalMembership() {
  return (
    <div className="section-calma">
      <div className="container-calma">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Membresía</h1>
          <p className="text-text-light">Elige el plan que se ajuste a tu práctica.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.recommended ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Crown size={20} className="text-primary" />
                    {plan.name}
                  </CardTitle>
                  {plan.recommended && <Badge variant="success">Recomendado</Badge>}
                </div>
                <CardDescription className="text-2xl font-bold text-text">{plan.price}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-text-light text-sm">
                      <Check size={16} className="text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={plan.recommended ? 'primary' : 'outline'} className="w-full">
                  {plan.recommended ? 'Actualizar plan' : 'Plan actual'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
