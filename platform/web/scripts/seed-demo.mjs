// SOMOS-CALMA — Seed de usuarios demo
//
// USO (desde la carpeta platform/web):
//   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-demo.mjs
//
// ADVERTENCIA: El service role key tiene privilegios totales. Úsalo solo en
// entornos controlados y nunca lo expongas en el frontend ni en el repositorio.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const demoUsers = [
  {
    email: 'paciente@demo.com',
    password: 'demo123',
    full_name: 'Ana Demo',
    role: 'patient',
  },
  {
    email: 'profesional@demo.com',
    password: 'demo123',
    full_name: 'Dra. María Demo',
    role: 'professional',
  },
  {
    email: 'admin@demo.com',
    password: 'demo123',
    full_name: 'Admin Demo',
    role: 'admin',
  },
]

async function seed() {
  console.log('🔍 Buscando usuarios demo previos...')
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw listError

  for (const demo of demoUsers) {
    const existing = users.find((u) => u.email === demo.email)
    if (existing) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existing.id)
      if (deleteError) {
        console.error(`⚠️  No se pudo borrar ${demo.email}:`, deleteError.message)
      } else {
        console.log(`🗑️  Usuario previo eliminado: ${demo.email}`)
      }
    }
  }

  console.log('🌱 Creando usuarios demo...')
  const createdIds = {}

  for (const demo of demoUsers) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: {
        full_name: demo.full_name,
        role: demo.role,
      },
    })

    if (error) {
      console.error(`❌ Error creando ${demo.email}:`, error.message)
    } else {
      createdIds[demo.role] = data.user.id
      console.log(`✅ Creado: ${demo.email} (id: ${data.user.id})`)
    }
  }

  // Completar perfil del profesional demo para que aparezca en el directorio.
  if (createdIds.professional) {
    const { error: profError } = await supabase
      .from('professional_profiles')
      .update({
        license_number: 'Psic. 12345 / Tanat. 67890',
        university: 'Universidad Nacional Autónoma de México',
        specialties: ['Tanatología clínica', 'Psicología del duelo', 'Salud mental'],
        approach: 'Acompañamiento cálido y profesional para procesos de duelo, pérdida y crisis vitales.',
        bio: 'Dra. María Demo cuenta con más de 10 años acompañando a personas y familias en momentos difíciles.',
        session_price: 40000,
        program_4_price: 160000,
        program_6_price: 220000,
        verification_status: 'verified',
        is_visible: true,
        rating: 4.9,
      })
      .eq('profile_id', createdIds.professional)

    if (profError) {
      console.error('⚠️  Error actualizando perfil profesional:', profError.message)
    } else {
      console.log('✅ Perfil profesional demo completado.')
    }

    // Crear disponibilidad básica para el profesional demo.
    const { data: profProfile, error: profProfileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('profile_id', createdIds.professional)
      .single()

    if (!profProfileError && profProfile) {
      const availability = [
        { professional_profile_id: profProfile.id, day_of_week: 1, start_time: '09:00', end_time: '14:00' },
        { professional_profile_id: profProfile.id, day_of_week: 3, start_time: '09:00', end_time: '14:00' },
        { professional_profile_id: profProfile.id, day_of_week: 5, start_time: '09:00', end_time: '12:00' },
      ]
      const { error: availError } = await supabase.from('availability').insert(availability)
      if (availError) {
        console.error('⚠️  Error creando disponibilidad:', availError.message)
      } else {
        console.log('✅ Disponibilidad del profesional demo creada.')
      }
    }
  }

  // Completar perfil del paciente demo.
  if (createdIds.patient) {
    const { error: patError } = await supabase
      .from('patient_profiles')
      .update({
        birth_date: '1990-05-15',
        gender: 'Mujer',
        emergency_contact_name: 'Carlos Demo',
        emergency_contact_phone: '5551234567',
        emergency_contact_relationship: 'Familiar',
        reason_for_visit: 'Ansiedad y estrés',
      })
      .eq('profile_id', createdIds.patient)

    if (patError) {
      console.error('⚠️  Error actualizando perfil paciente:', patError.message)
    } else {
      console.log('✅ Perfil paciente demo completado.')
    }
  }

  console.log('🏁 Listo. Los perfiles se generaron y completaron automáticamente.')
}

seed().catch((err) => {
  console.error('💥 Error inesperado:', err)
  process.exit(1)
})
