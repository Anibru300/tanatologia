import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type UserRole = 'patient' | 'professional' | 'admin'

export type User = {
  id: string
  email: string
  role: UserRole
  fullName: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, role?: UserRole) => Promise<void>
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users for beta development without Supabase keys
const MOCK_USERS: Record<string, User & { password: string }> = {
  'paciente@demo.com': {
    id: '1',
    email: 'paciente@demo.com',
    password: 'demo123',
    role: 'patient',
    fullName: 'Ana Demo',
  },
  'profesional@demo.com': {
    id: '2',
    email: 'profesional@demo.com',
    password: 'demo123',
    role: 'professional',
    fullName: 'Dra. María Demo',
  },
  'admin@demo.com': {
    id: '3',
    email: 'admin@demo.com',
    password: 'demo123',
    role: 'admin',
    fullName: 'Admin Demo',
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('somos-calma-user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string, role?: UserRole) => {
    // TODO: Replace with Supabase Auth
    const mock = MOCK_USERS[email.toLowerCase()]
    if (!mock || mock.password !== password) {
      throw new Error('Correo o contraseña incorrectos')
    }
    if (role && mock.role !== role) {
      throw new Error('No tienes acceso a este portal')
    }
    const { password: _, ...user } = mock
    setUser(user)
    localStorage.setItem('somos-calma-user', JSON.stringify(user))
  }

  const register = async (email: string, _password: string, fullName: string, role: UserRole) => {
    // TODO: Replace with Supabase Auth + profile creation
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      role,
      fullName,
    }
    setUser(newUser)
    localStorage.setItem('somos-calma-user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('somos-calma-user')
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
