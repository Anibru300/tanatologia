import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ComingSoon({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <div className="section-calma">
      <div className="container-calma max-w-2xl mx-auto">
        <Card className="text-center">
          <CardContent className="p-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles size={40} className="text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-text mb-3">{title}</h1>
            <p className="text-text-light mb-8">{description}</p>
            {actionLabel && actionTo && (
              <Link to={actionTo}>
                <Button>{actionLabel}</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
