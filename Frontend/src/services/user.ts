import { get } from './api'
import type { UserListResponse } from './types'

export const userService = {
  list() {
    return get<UserListResponse>('/users')
  },
}