import { get, post, patch, del } from './api'
import type {
  Workspace,
  WorkspaceListResponse,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceDirectoryResponse,
  WorkspaceMember,
  AddMemberRequest,
  UpdateMemberRequest,
} from './types'

export const workspaceService = {
  list() {
    return get<WorkspaceListResponse>('/workspaces')
  },

  create(data: CreateWorkspaceRequest) {
    return post<Workspace>('/workspaces', data)
  },

  getDirectory(workspaceId: string, parentId?: string) {
    const params = parentId ? `?parentId=${parentId}` : ''
    return get<WorkspaceDirectoryResponse>(`/workspaces/${workspaceId}${params}`)
  },

  update(workspaceId: string, data: UpdateWorkspaceRequest) {
    return patch<Workspace>(`/workspaces/${workspaceId}`, data)
  },

  delete(workspaceId: string) {
    return del<{ message: string }>(`/workspaces/${workspaceId}`)
  },

  listMembers(workspaceId: string) {
    return get<{ items: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`)
  },

  addMember(workspaceId: string, data: AddMemberRequest) {
    return post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, data)
  },

  updateMember(workspaceId: string, userId: string, data: UpdateMemberRequest) {
    return patch<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${userId}`,
      data,
    )
  },

  removeMember(workspaceId: string, userId: string) {
    return del<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`)
  },
}