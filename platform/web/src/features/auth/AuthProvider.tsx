import { useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Alert } from '@/components/ui/Alert'
import { AuthContext } from './AuthContext'
import type { User, UserRole } from './types'

function mapProfile(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    role: row.role as UserRole,
    fullName: String(row.full_name),
  }
}

async function fetchProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('No se encontró el perfil asociado a la cuenta')
  }

  return mapProfile(data as Record<string, unknown>)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Error visible cuando hay sesión válida pero el perfil no se pudo cargar;
  // sin esto el usuario era redirigido al login sin explicación alguna.
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    // Cargar sesión existente al iniciar la app
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          setUser(profile)
          setProfileError(null)
        } catch (err) {
          console.error('Error cargando perfil:', err)
          setUser(null)
          setProfileError(
            'Tu sesión sigue activa, pero no pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.'
          )
        }
      }

      setIsLoading(false)
    })

    // Escuchar cambios de autenticación de Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setIsLoading(false)
        return
      }

      if (session.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          setUser(profile)
          setProfileError(null)
        } catch (err) {
          console.error('Error cargando perfil tras cambio de auth:', err)
          setUser(null)
          setProfileError(
            'Tu sesión sigue activa, pero no pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.'
          )
        }
      }

      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string, role?: UserRole) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('No se pudo iniciar sesión')
    }

    const profile = await fetchProfile(data.user.id)

    if (role && profile.role !== role) {
      await supabase.auth.signOut()
      throw new Error('No tienes acceso a este portal')
    }

    setUser(profile)
  }

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Estos metadatos son leídos por el trigger handle_new_user() en la base de datos
        // para crear el perfil atómicamente dentro de la misma transacción.
        // `timezone` (zona horaria IANA del navegador) alimenta la geografía aproximada
        // del panel Admin (país/ciudad), sin usar IP.
        data: {
          full_name: fullName,
          role,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        },
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('No se pudo crear la cuenta')
    }

    // Si Supabase requiere confirmación por email, data.session será null.
    // El perfil ya se creó gracias al trigger, pero no iniciamos sesión automáticamente.
    if (!data.session) {
      return
    }

    const profile = await fetchProfile(data.user.id)
    setUser(profile)
  }

  const logout = () => {
    supabase.auth.signOut().then(() => setUser(null))
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {profileError && (
        <div className="fixed top-0 inset-x-0 z-[70] px-4 pt-4">
          <Alert variant="error" className="max-w-2xl mx-auto p-4 rounded-sm shadow-lg">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex-1 min-w-[200px]">{profileError}</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileError(null)
                  supabase.auth.signOut()
                }}
                className="font-semibold underline underline-offset-2"
              >
                Cerrar sesión
              </button>
            </div>
          </Alert>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  )
}


