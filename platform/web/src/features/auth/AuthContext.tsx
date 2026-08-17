import { createContext } from 'react'
import type { User, UserRole } from './types'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, role?: UserRole) => Promise<void>
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
