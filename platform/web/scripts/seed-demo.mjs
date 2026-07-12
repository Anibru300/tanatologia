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
      console.log(`✅ Creado: ${demo.email} (id: ${data.user.id})`)
    }
  }

  console.log('🏁 Listo. Los perfiles se generaron automáticamente por el trigger handle_new_user().')
}

seed().catch((err) => {
  console.error('💥 Error inesperado:', err)
  process.exit(1)
})
