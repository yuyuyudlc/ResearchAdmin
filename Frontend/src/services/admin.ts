import { del, get, patch, post } from './api'
import type {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminListUsersQuery,
  AdminMoveUserRequest,
  AdminResetPasswordResponse,
  AdminUpdateUserRequest,
  AdminUserListResponse,
  CreateOrganizationRequest,
  MoveOrganizationUsersRequest,
  Organization,
  OrganizationListResponse,
  UpdateOrganizationRequest,
  User,
} from './types'

function buildUsersQuery(query: AdminListUsersQuery = {}): string {
  const params = new URLSearchParams()
  if (query.q && query.q.trim()) params.set('q', query.q.trim())
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.organizationId === null || query.organizationId === 'unassigned') {
    params.set('organizationId', 'unassigned')
  } else if (typeof query.organizationId === 'string' && query.organizationId !== '') {
    params.set('organizationId', query.organizationId)
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export const adminService = {
  // 机构
  listOrganizations(q?: string) {
    const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
    return get<OrganizationListResponse>(`/admin/organizations${qs}`)
  },

  createOrganization(data: CreateOrganizationRequest) {
    return post<Organization>('/admin/organizations', data)
  },

  updateOrganization(orgId: string, data: UpdateOrganizationRequest) {
    return patch<Organization>(`/admin/organizations/${orgId}`, data)
  },

  /**
   * 删除机构。若有成员需传 targetOrgId：实际机构 UUID 或 'unassigned'。
   */
  deleteOrganization(orgId: string, targetOrgId?: string) {
    const qs = targetOrgId ? `?targetOrgId=${encodeURIComponent(targetOrgId)}` : ''
    return del<{ message: string }>(`/admin/organizations/${orgId}${qs}`)
  },

  moveOrganizationUsers(orgId: string, data: MoveOrganizationUsersRequest) {
    return post<{ affected: number }>(`/admin/organizations/${orgId}/move-users`, data)
  },

  // 用户
  listUsers(query: AdminListUsersQuery = {}) {
    return get<AdminUserListResponse>(`/admin/users${buildUsersQuery(query)}`)
  },

  getUser(userId: string) {
    return get<User>(`/admin/users/${userId}`)
  },

  createUser(data: AdminCreateUserRequest) {
    return post<AdminCreateUserResponse>('/admin/users', data)
  },

  updateUser(userId: string, data: AdminUpdateUserRequest) {
    return patch<User>(`/admin/users/${userId}`, data)
  },

  deleteUser(userId: string) {
    return del<{ message: string }>(`/admin/users/${userId}`)
  },

  moveUser(userId: string, data: AdminMoveUserRequest) {
    return post<User>(`/admin/users/${userId}/move`, data)
  },

  resetPassword(userId: string) {
    return post<AdminResetPasswordResponse>(`/admin/users/${userId}/reset-password`)
  },

  setUserStatus(userId: string, status: 'active' | 'disabled') {
    return post<{ status: string }>(`/admin/users/${userId}/status`, { status })
  },
}