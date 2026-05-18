import { get, post, patch, del } from './api'
import type {
  ACLListResponse,
  ACLItem,
  CreateACLRequest,
  UpdateACLRequest,
  MyPermissionResponse,
} from './types'

export const aclService = {
  list(documentId: string) {
    return get<ACLListResponse>(`/documents/${documentId}/acl`)
  },

  create(documentId: string, data: CreateACLRequest) {
    return post<ACLItem>(`/documents/${documentId}/acl`, data)
  },

  update(documentId: string, aclId: string, data: UpdateACLRequest) {
    return patch<ACLItem>(`/documents/${documentId}/acl/${aclId}`, data)
  },

  delete(documentId: string, aclId: string) {
    return del<{ message: string }>(`/documents/${documentId}/acl/${aclId}`)
  },

  myPermission(documentId: string) {
    return get<MyPermissionResponse>(`/documents/${documentId}/my-permission`)
  },
}