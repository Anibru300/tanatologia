export type UserRole = 'patient' | 'professional' | 'admin'

export type User = {
  id: string
  email: string
  role: UserRole
  fullName: string
}
