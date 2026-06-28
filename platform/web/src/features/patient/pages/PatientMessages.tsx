import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Send } from 'lucide-react'

const conversations = [
  { id: 1, name: 'Dra. María Rodríguez', lastMessage: 'Hola, ¿cómo te sentiste después de la sesión?', time: '10:30', unread: 1 },
]

export function PatientMessages() {
  return (
    <div className="section-calma h-[calc(100vh-64px)]">
      <div className="container-calma h-full">
        <div className="grid md:grid-cols-3 gap-6 h-full">
          <Card className="md:col-span-1 overflow-hidden">
            <CardHeader>
              <CardTitle>Mensajes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  className="w-full text-left p-4 border-b border-border hover:bg-bg-alt transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text">{conv.name}</span>
                    <span className="text-xs text-text-light">{conv.time}</span>
                  </div>
                  <p className="text-sm text-text-light truncate">{conv.lastMessage}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle>Dra. María Rodríguez</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <div className="flex-1 space-y-4">
                <div className="bg-bg-alt rounded-[16px] rounded-tl-none p-4 max-w-[80%]">
                  <p className="text-text text-sm">Hola, ¿cómo te sentiste después de la sesión?</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Input placeholder="Escribe un mensaje..." className="flex-1" />
                <Button><Send size={18} /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
