import type { AuthUser } from './types/auth'

const TOKEN_KEY = 'research_admin_access_token'
const USER_KEY = 'research_admin_user'

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }

  try {
    const user = JSON.parse(raw) as Partial<AuthUser>
    if (!user || typeof user !== 'object') {
      return null
    }

    return {
      id: Number(user.id ?? 0),
      username: String(user.username ?? ''),
      email: String(user.email ?? ''),
      organization: String(user.organization ?? ''),
      avatarUrl: String(user.avatarUrl ?? ''),
      signature: String(user.signature ?? ''),
      professionalTitle: String(user.professionalTitle ?? ''),
      supervisor: String(user.supervisor ?? ''),
      displayName: String(user.displayName ?? user.username ?? ''),
      status: String(user.status ?? 'active'),
      role: user.role === 'admin' || user.role === 'owner' || user.role === 'member' ? user.role : 'member',
    }
  } catch {
    return null
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
