import { createClient } from '@supabase/supabase-js'

// .trim() por si el secret quedó con salto de línea al pegarlo (rompe Realtime).
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email: string
  role: 'patient' | 'professional' | 'admin'
  full_name: string
}
