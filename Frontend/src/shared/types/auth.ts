export type UserRole = 'admin' | 'owner' | 'member'

export interface AuthUser {
  id: number
  username: string
  email: string
  organization: string
  avatarUrl: string
  signature: string
  professionalTitle: string
  supervisor: string
  displayName: string
  status: string
  role: UserRole
}

export interface LoginResult {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
