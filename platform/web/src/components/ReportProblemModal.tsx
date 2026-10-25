import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabase'
import { Send } from 'lucide-react'

const PROBLEM_TYPES = [
  { value: 'No puedo entrar a mi videollamada', label: 'No puedo entrar a mi videollamada' },
  { value: 'Error con mis citas o mi agenda', label: 'Error con mis citas o mi agenda' },
  { value: 'No puedo subir archivos o documentos', label: 'No puedo subir archivos o documentos' },
  { value: 'Problema con mi cuenta o contraseña', label: 'Problema con mi cuenta o contraseña' },
  { value: 'Otro', label: 'Otro' },
]

interface ReportProblemModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Formulario rápido "Reportar un problema" para dashboards de paciente y
 * profesional. Reutiliza la Edge Function support-request: el reporte cae en
 * la Bandeja/Soporte del admin y se responde al correo del usuario.
 */
export function ReportProblemModal({ open, onClose }: ReportProblemModalProps) {
  const [tipo, setTipo] = useState(PROBLEM_TYPES[0].value)
  const [descripcion, setDescripcion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function handleClose() {
    onClose()
    // Al reabrir, dejar listo para un reporte nuevo
    setTimeout(() => {
      setDescripcion('')
      setError('')
      setSent(false)
      setTipo(PROBLEM_TYPES[0].value)
    }, 200)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (descripcion.trim().length < 10) {
      setError('Cuéntanos un poco más (mínimo 10 caracteres) para poder ayudarte.')
      return
    }
    setSending(true)
    setError('')
    try {
      const deviceInfo = [
        `Tipo de problema: ${tipo}`,
        '',
        descripcion.trim(),
        '',
        `— Navegador: ${navigator.userAgent}`,
        `— Fecha: ${new Date().toLocaleString('es-MX')}`,
      ].join('\n')
      const { data, error: invokeError } = await supabase.functions.invoke('support-request', {
        body: { subject: `[Problema] ${tipo}`, message: deviceInfo },
      })
      if (invokeError) {
        const status = (invokeError as { context?: Response }).context?.status
        throw new Error(
          (data && typeof data === 'object' ? (data as { error?: string }).error : undefined) ||
            (status === 429 ? 'Demasiados mensajes. Espera un minuto e inténtalo de nuevo.' : invokeError.message)
        )
      }
      if (!data?.ok) throw new Error(data?.error || 'No se pudo enviar tu reporte.')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu reporte.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reportar un problema" className="max-w-lg">
      {sent ? (
        <div className="text-center py-4">
          <Alert variant="success" className="mb-4">
            Recibimos tu reporte. Nuestro equipo lo revisará y te responderá a tu correo registrado
            lo antes posible.
          </Alert>
          <Button onClick={handleClose}>Cerrar</Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <p className="text-sm text-text-light mb-4">
            ¿Algo no funciona bien? Cuéntanos y lo revisamos. El reporte llega directo a nuestro
            equipo de soporte.
          </p>
          <Select
            label="¿Qué está fallando?"
            options={PROBLEM_TYPES}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="mb-4"
          />
          <Textarea
            label="Describe el problema"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Entro a mi sesión y no carga la cámara, solo se ve pantalla negra…"
            rows={4}
            maxLength={3000}
          />
          {error && <Alert variant="error" className="mt-3">{error}</Alert>}
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={sending}>
              <Send size={16} />
              {sending ? 'Enviando…' : 'Enviar reporte'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
