import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { FileText, Save } from 'lucide-react'
import {
  getProfessionalProfileId,
  getAppointmentsForProfessional,
  type Appointment,
} from '@/features/appointments/appointmentsService'

type ClinicalNote = {
  id: string
  content: string
  created_at: string
  patientName: string
}

export function ProfessionalNotes() {
  const { user } = useAuth()
  const [professionalProfileId, setProfessionalProfileId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [patientId, setPatientId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [desarrollo, setDesarrollo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      try {
        const ppId = await getProfessionalProfileId(userId)
        if (!ppId) return
        const [appointmentData, notesData] = await Promise.all([
          getAppointmentsForProfessional(ppId),
          loadNotes(ppId),
        ])
        if (cancelled) return
        setProfessionalProfileId(ppId)
        setAppointments(appointmentData)
        setNotes(notesData)
      } catch (err) {
        console.error('Error cargando notas:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  async function loadNotes(ppId: string): Promise<ClinicalNote[]> {
    const { data, error } = await supabase
      .from('clinical_notes')
      .select('id, content, created_at, patient_profiles(full_name)')
      .eq('professional_profile_id', ppId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    return (data || []).map((row: Record<string, unknown>) => {
      const rawPatient = row.patient_profiles
      const patient = (Array.isArray(rawPatient) ? rawPatient[0] : rawPatient) as { full_name?: string } | null
      return {
        id: String(row.id),
        content: String(row.content),
        created_at: String(row.created_at),
        patientName: patient?.full_name || 'Paciente',
      }
    })
  }

  // Pacientes únicos derivados de las citas del profesional
  const patients = [...new Map(appointments.map((a) => [a.patient_profile_id, a.patientName])).entries()]
    .map(([id, name]) => ({ value: id, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  async function handleSave() {
    setMessage(null)
    if (!professionalProfileId) return
    if (!patientId) {
      setMessage({ type: 'error', text: 'Selecciona un paciente.' })
      return
    }
    if (!motivo.trim() && !desarrollo.trim() && !observaciones.trim()) {
      setMessage({ type: 'error', text: 'Escribe el contenido de la nota.' })
      return
    }

    const patientAppointments = appointments
      .filter((a) => a.patient_profile_id === patientId)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    const lastAppointment = patientAppointments[0]
    if (!lastAppointment) {
      setMessage({ type: 'error', text: 'El paciente no tiene citas registradas para asociar la nota.' })
      return
    }

    const sections = [
      motivo.trim() && `Motivo de consulta:\n${motivo.trim()}`,
      desarrollo.trim() && `Desarrollo de la sesión:\n${desarrollo.trim()}`,
      observaciones.trim() && `Observaciones y plan de trabajo:\n${observaciones.trim()}`,
    ].filter(Boolean)

    setSaving(true)
    try {
      const { error } = await supabase.from('clinical_notes').insert({
        appointment_id: lastAppointment.id,
        professional_profile_id: professionalProfileId,
        patient_profile_id: patientId,
        content: sections.join('\n\n'),
        note_type: 'progress',
      })
      if (error) throw new Error(error.message)

      setNotes(await loadNotes(professionalProfileId))
      setMotivo('')
      setDesarrollo('')
      setObservaciones('')
      setPatientId('')
      setMessage({ type: 'success', text: 'Nota guardada correctamente.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo guardar la nota' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="section-calma">
      <div className="container-calma max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Notas clínicas</h1>
          <p className="text-text-light">Registra la evolución de tus pacientes de forma segura.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nueva nota clínica</CardTitle>
            <CardDescription>La información está protegida y solo tú puedes verla.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`p-3 rounded-[12px] text-sm ${
                  message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}
              >
                {message.text}
              </div>
            )}
            <Select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              options={[{ value: '', label: 'Seleccionar paciente' }, ...patients]}
            />
            <Textarea placeholder="Motivo de consulta" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <Textarea placeholder="Desarrollo de la sesión" rows={4} value={desarrollo} onChange={(e) => setDesarrollo(e.target.value)} />
            <Textarea placeholder="Observaciones y plan de trabajo" rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            <Button className="gap-2" onClick={handleSave} disabled={saving || loading}>
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar nota'}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 space-y-4">
          <h3 className="font-semibold text-text">Notas recientes</h3>
          {loading ? (
            <p className="text-text-light">Cargando notas...</p>
          ) : notes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-text-light">
                <FileText size={48} className="mx-auto mb-4 text-muted" />
                <p>Aún no tienes notas clínicas registradas.</p>
              </CardContent>
            </Card>
          ) : (
            notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <FileText className="text-primary shrink-0" size={24} />
                    <div>
                      <p className="font-medium text-text">{note.patientName}</p>
                      <p className="text-sm text-text-light">
                        {new Date(note.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-text-light mt-2 text-sm whitespace-pre-line">{note.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
