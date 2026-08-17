import { supabase } from '@/lib/supabase'

const BUCKET = 'professional-documents'
const SIGNED_URL_TTL_SECONDS = 3600

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB (límite del bucket)
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export type DocumentType =
  | 'cedula'
  | 'titulo'
  | 'ine'
  | 'comprobante_domicilio'
  | 'constancia_fiscal'
  | 'otro'

export type VerificationStatus = 'pending' | 'in_review' | 'verified' | 'rejected'
export type DocumentStatus = 'uploaded' | 'approved' | 'rejected'

export type ProfessionalDocument = {
  id: string
  professional_profile_id: string
  document_type: DocumentType
  storage_path: string
  file_name: string
  status: DocumentStatus
  rejection_reason?: string
  reviewed_at?: string
  created_at: string
}

export type MyProfessionalProfile = {
  id: string
  profile_id: string
  full_name: string
  license_number?: string
  university?: string
  verification_status: VerificationStatus
  rejection_reason?: string
  verified_at?: string
  is_visible: boolean
  rating: number
}

export type ProfessionalWithDocuments = {
  id: string // professional_profiles.id
  profile_id: string
  full_name: string
  email: string
  license_number?: string
  university?: string
  verification_status: VerificationStatus
  is_visible: boolean
  documents_count: number
  created_at: string
}

function mapDocument(row: Record<string, unknown>): ProfessionalDocument {
  return {
    id: String(row.id),
    professional_profile_id: String(row.professional_profile_id),
    document_type: row.document_type as DocumentType,
    storage_path: String(row.storage_path),
    file_name: String(row.file_name),
    status: row.status as DocumentStatus,
    rejection_reason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : undefined,
    created_at: String(row.created_at),
  }
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
  }

  return user.id
}

// =============================================================================
// Profesional: perfil de verificación
// =============================================================================

export async function getMyProfessionalProfile(): Promise<MyProfessionalProfile> {
  const userId = await requireUserId()

  const { data, error } = await supabase
    .from('professional_profiles')
    .select(
      'id, profile_id, full_name, license_number, university, verification_status, rejection_reason, verified_at, is_visible, rating'
    )
    .eq('profile_id', userId)
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('No se encontró tu perfil profesional')

  const row = data as Record<string, unknown>
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    full_name: String(row.full_name || ''),
    license_number: row.license_number ? String(row.license_number) : undefined,
    university: row.university ? String(row.university) : undefined,
    verification_status: (row.verification_status as VerificationStatus) || 'pending',
    rejection_reason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    verified_at: row.verified_at ? String(row.verified_at) : undefined,
    is_visible: Boolean(row.is_visible),
    rating: Number(row.rating ?? 0),
  }
}

export async function updateLicenseNumber(licenseNumber: string): Promise<void> {
  const profile = await getMyProfessionalProfile()
  const trimmed = licenseNumber.trim()

  if (trimmed.length < 4) {
    throw new Error('El número de cédula debe tener al menos 4 caracteres')
  }

  const { error } = await supabase
    .from('professional_profiles')
    .update({ license_number: trimmed })
    .eq('id', profile.id)

  if (error) throw new Error(error.message)
}

// =============================================================================
// Profesional: documentos
// =============================================================================

export async function getMyDocuments(): Promise<ProfessionalDocument[]> {
  const profile = await getMyProfessionalProfile()

  const { data, error } = await supabase
    .from('professional_documents')
    .select('*')
    .eq('professional_profile_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row) => mapDocument(row as Record<string, unknown>))
}

export async function uploadDocument(file: File, documentType: DocumentType): Promise<ProfessionalDocument> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o PDF.')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('El archivo supera el límite de 10 MB.')
  }

  const userId = await requireUserId()
  const profile = await getMyProfessionalProfile()

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin'
  const storagePath = `${userId}/${documentType}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })

  if (uploadError) throw new Error(uploadError.message)

  const { data, error: insertError } = await supabase
    .from('professional_documents')
    .insert({
      professional_profile_id: profile.id,
      document_type: documentType,
      storage_path: storagePath,
      file_name: file.name,
    })
    .select()
    .single()

  if (insertError) {
    // Revertir el archivo subido para no dejar huérfanos en Storage
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw new Error(insertError.message)
  }

  return mapDocument(data as Record<string, unknown>)
}

export async function deleteDocument(id: string, storagePath: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('professional_documents')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  if ((data as { status: string }).status !== 'uploaded') {
    throw new Error('Solo puedes eliminar documentos que aún no han sido revisados.')
  }

  const { error: deleteError } = await supabase.from('professional_documents').delete().eq('id', id)

  if (deleteError) throw new Error(deleteError.message)

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (storageError) {
    // El registro ya se eliminó; advertimos para que el usuario lo sepa.
    throw new Error(`El documento se eliminó, pero el archivo no pudo borrarse de Storage: ${storageError.message}`)
  }
}

export async function submitForReview(): Promise<string> {
  const { data, error } = await supabase.rpc('submit_for_review')

  if (error) {
    // La función lanza mensajes en español desde la base de datos
    throw new Error(error.message)
  }

  return String(data)
}

// =============================================================================
// Administrador: revisión de expedientes
// =============================================================================

export async function getProfessionalsWithDocuments(): Promise<ProfessionalWithDocuments[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `id, email, full_name, created_at,
       professional_profiles!professional_profiles_profile_id_fkey(
         id, full_name, license_number, university, verification_status, is_visible,
         professional_documents(count)
       )`
    )
    .eq('role', 'professional')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: Record<string, unknown>) => {
    // Con la FK explícita PostgREST devuelve objeto (1:1); se tolera arreglo por compatibilidad
    const rawPp = row.professional_profiles
    const pp = (Array.isArray(rawPp) ? rawPp[0] : rawPp) as Record<string, unknown> || {}
    const docsCount = ((pp.professional_documents as { count: number }[]) || [])[0]?.count ?? 0

    return {
      id: String(pp.id || row.id),
      profile_id: String(row.id),
      full_name: String(pp.full_name || row.full_name),
      email: String(row.email),
      license_number: pp.license_number ? String(pp.license_number) : undefined,
      university: pp.university ? String(pp.university) : undefined,
      verification_status: (pp.verification_status as VerificationStatus) || 'pending',
      is_visible: Boolean(pp.is_visible),
      documents_count: Number(docsCount),
      created_at: String(row.created_at),
    }
  })
}

export async function getDocumentsForProfessional(professionalProfileId: string): Promise<ProfessionalDocument[]> {
  const { data, error } = await supabase
    .from('professional_documents')
    .select('*')
    .eq('professional_profile_id', professionalProfileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row) => mapDocument(row as Record<string, unknown>))
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error) throw new Error(error.message)
  if (!data?.signedUrl) throw new Error('No se pudo generar el enlace del documento')

  return data.signedUrl
}

export async function approveProfessional(id: string): Promise<void> {
  const { error } = await supabase
    .from('professional_profiles')
    .update({ verification_status: 'verified', is_visible: true })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function rejectProfessional(id: string, reason: string): Promise<void> {
  const trimmed = reason.trim()

  if (!trimmed) {
    throw new Error('Debes indicar el motivo del rechazo.')
  }

  const { error } = await supabase
    .from('professional_profiles')
    .update({ verification_status: 'rejected', rejection_reason: trimmed, is_visible: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function setDocumentStatus(
  docId: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<void> {
  if (status === 'rejected' && !reason?.trim()) {
    throw new Error('Debes indicar el motivo del rechazo del documento.')
  }

  const userId = await requireUserId()

  const { error } = await supabase
    .from('professional_documents')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason!.trim() : null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', docId)

  if (error) throw new Error(error.message)
}
