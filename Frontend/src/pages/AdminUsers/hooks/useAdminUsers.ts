import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { adminService } from '../../../services/admin'
import type {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminUpdateUserRequest,
  CreateOrganizationRequest,
  Organization,
  UpdateOrganizationRequest,
  User,
} from '../../../services/types'

const ADMIN_USERNAME = 'admin'

/** 「未分配机构」虚拟项的本地选择值 */
export const UNASSIGNED_KEY = '__unassigned__'
export const UNASSIGNED_LABEL = '未分配机构'

const DEFAULT_PAGE_SIZE = 20

export interface UserTableState {
  items: User[]
  total: number
  page: number
  pageSize: number
  q: string
}

export type OrgSelection = string | typeof UNASSIGNED_KEY | null

export function useAdminUsers() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.username === ADMIN_USERNAME

  // 路由守卫
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (!isAdmin) {
      navigate('/', { replace: true })
    }
  }, [authLoading, user, isAdmin, navigate])

  const [orgLoading, setOrgLoading] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgSearch, setOrgSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<OrgSelection>(null)

  const [usersLoading, setUsersLoading] = useState(false)
  const [usersState, setUsersState] = useState<UserTableState>({
    items: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: '',
  })
  const [error, setError] = useState('')

  const fetchOrganizations = useCallback(async () => {
    if (!isAdmin) return
    setOrgLoading(true)
    setError('')
    try {
      const res = await adminService.listOrganizations(orgSearch)
      const items = res.data.items || []
      setOrganizations(items)
      setSelectedOrg((curr) => {
        if (curr === UNASSIGNED_KEY) return curr
        if (typeof curr === 'string' && items.some((o) => o.id === curr)) return curr
        return items.length > 0 ? items[0].id : UNASSIGNED_KEY
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载机构失败')
    } finally {
      setOrgLoading(false)
    }
  }, [isAdmin, orgSearch])

  const fetchUsers = useCallback(
    async (
      selection: OrgSelection,
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      q = '',
    ) => {
      if (selection === null) return
      setUsersLoading(true)
      setError('')
      try {
        const res = await adminService.listUsers({
          organizationId: selection === UNASSIGNED_KEY ? 'unassigned' : selection,
          page,
          pageSize,
          q,
        })
        setUsersState({
          items: res.data.items || [],
          total: res.data.total || 0,
          page: res.data.page || page,
          pageSize: res.data.pageSize || pageSize,
          q,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载用户失败')
        setUsersState({ items: [], total: 0, page, pageSize, q })
      } finally {
        setUsersLoading(false)
      }
    },
    [],
  )

  // 选中变化 → 拉用户（重置搜索）
  useEffect(() => {
    if (selectedOrg === null) return
    fetchUsers(selectedOrg, 1, DEFAULT_PAGE_SIZE, '')
  }, [selectedOrg, fetchUsers])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  // 机构 CRUD
  const createOrganization = useCallback(async (data: CreateOrganizationRequest) => {
    const res = await adminService.createOrganization(data)
    await fetchOrganizations()
    setSelectedOrg(res.data.id)
    return res.data
  }, [fetchOrganizations])

  const updateOrganization = useCallback(async (orgId: string, data: UpdateOrganizationRequest) => {
    const res = await adminService.updateOrganization(orgId, data)
    await fetchOrganizations()
    return res.data
  }, [fetchOrganizations])

  const deleteOrganization = useCallback(async (orgId: string, targetOrgId?: string) => {
    await adminService.deleteOrganization(orgId, targetOrgId)
    await fetchOrganizations()
  }, [fetchOrganizations])

  // 用户 CRUD
  const createUser = useCallback(
    async (payload: AdminCreateUserRequest): Promise<AdminCreateUserResponse> => {
      const res = await adminService.createUser(payload)
      await fetchOrganizations()
      const targetSelection: OrgSelection = payload.organizationId
        ? payload.organizationId
        : UNASSIGNED_KEY
      if (targetSelection === selectedOrg) {
        await fetchUsers(targetSelection, 1, usersState.pageSize, usersState.q)
      } else {
        setSelectedOrg(targetSelection)
      }
      return res.data
    },
    [fetchOrganizations, fetchUsers, selectedOrg, usersState.pageSize, usersState.q],
  )

  const updateUser = useCallback(async (userId: string, data: AdminUpdateUserRequest) => {
    const res = await adminService.updateUser(userId, data)
    if (selectedOrg !== null) {
      await fetchUsers(selectedOrg, usersState.page, usersState.pageSize, usersState.q)
    }
    return res.data
  }, [fetchUsers, selectedOrg, usersState.page, usersState.pageSize, usersState.q])

  const deleteUser = useCallback(async (userId: string) => {
    await adminService.deleteUser(userId)
    await fetchOrganizations()
    if (selectedOrg !== null) {
      await fetchUsers(selectedOrg, usersState.page, usersState.pageSize, usersState.q)
    }
  }, [fetchOrganizations, fetchUsers, selectedOrg, usersState.page, usersState.pageSize, usersState.q])

  const moveUser = useCallback(async (userId: string, organizationId: string | null) => {
    await adminService.moveUser(userId, { organizationId })
    await fetchOrganizations()
    if (selectedOrg !== null) {
      await fetchUsers(selectedOrg, usersState.page, usersState.pageSize, usersState.q)
    }
  }, [fetchOrganizations, fetchUsers, selectedOrg, usersState.page, usersState.pageSize, usersState.q])

  const resetPassword = useCallback(async (userId: string) => {
    const res = await adminService.resetPassword(userId)
    return res.data.initialPassword
  }, [])

  const setUserStatus = useCallback(async (userId: string, status: 'active' | 'disabled') => {
    await adminService.setUserStatus(userId, status)
    if (selectedOrg !== null) {
      await fetchUsers(selectedOrg, usersState.page, usersState.pageSize, usersState.q)
    }
  }, [fetchUsers, selectedOrg, usersState.page, usersState.pageSize, usersState.q])

  const refresh = useCallback(async () => {
    await fetchOrganizations()
    if (selectedOrg !== null) {
      await fetchUsers(selectedOrg, usersState.page, usersState.pageSize, usersState.q)
    }
  }, [fetchOrganizations, fetchUsers, selectedOrg, usersState.page, usersState.pageSize, usersState.q])

  const orgById = useMemo(() => {
    const map = new Map<string, Organization>()
    for (const o of organizations) map.set(o.id, o)
    return map
  }, [organizations])

  return {
    isAdmin,
    authLoading,
    error,
    orgLoading,
    organizations,
    orgById,
    orgSearch,
    setOrgSearch,
    selectedOrg,
    setSelectedOrg,
    usersLoading,
    usersState,
    fetchUsers,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    createUser,
    updateUser,
    deleteUser,
    moveUser,
    resetPassword,
    setUserStatus,
    refresh,
  }
}