import { get } from './api'
import type { User, UserListResponse } from './types'

export const userService = {
  list() {
    return get<UserListResponse>('/users')
  },
  search(q: string) {
    return get<User[]>(`/users/search?q=${encodeURIComponent(q)}`)
  },
}