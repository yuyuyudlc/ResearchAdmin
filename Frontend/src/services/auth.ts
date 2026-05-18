import { post, put } from './api'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from './types'

export const authService = {
  login(data: LoginRequest) {
    return post<LoginResponse>('/auth/login', data, { skipAuthRedirect: true })
  },

  register(data: RegisterRequest) {
    return post<{ message: string }>('/auth/register', data)
  },

  changePassword(data: ChangePasswordRequest) {
    return put<{ message: string }>('/auth/password', data)
  },

  updateProfile(data: UpdateProfileRequest) {
    return put<{ message: string }>('/auth/profile', data)
  },

  logout() {
    return post<{ message: string }>('/auth/logout')
  },
}