import { get, post, patch, del, getBinary, putBinary } from './api'
import type {
  DocumentNode,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  MoveDocumentRequest,
} from './types'

export const documentService = {
  create(workspaceId: string, data: CreateDocumentRequest) {
    return post<DocumentNode>(`/workspaces/${workspaceId}/documents`, data)
  },

  upload(workspaceId: string, formData: FormData) {
    return post<DocumentNode>(`/workspaces/${workspaceId}/documents/upload`, formData)
  },

  getDetail(documentId: string) {
    return get<DocumentNode>(`/documents/${documentId}`)
  },

  update(documentId: string, data: UpdateDocumentRequest) {
    return patch<DocumentNode>(`/documents/${documentId}`, data)
  },

  move(documentId: string, data: MoveDocumentRequest) {
    return post<DocumentNode>(`/documents/${documentId}/move`, data)
  },

  archive(documentId: string) {
    return post<{ message: string }>(`/documents/${documentId}/archive`)
  },

  restore(documentId: string) {
    return post<{ message: string }>(`/documents/${documentId}/restore`)
  },

  delete(documentId: string) {
    return del<{ message: string }>(`/documents/${documentId}`)
  },

  download(documentId: string) {
    return get<{ sourceStorageKey: string }>(`/documents/${documentId}/download`)
  },

  getBody(documentId: string) {
    return getBinary(`/documents/${documentId}/body`)
  },

  putBody(documentId: string, data: Uint8Array, headers?: Record<string, string>) {
    return putBinary<{ size: number }>(`/documents/${documentId}/body`, data, {
      'X-Body-Type': 'yjs_state',
      ...headers,
    })
  },

  putFileBody(documentId: string, data: Uint8Array, bodyType: string) {
    return putBinary<{ size: number }>(`/documents/${documentId}/body`, data, {
      'Content-Type': 'application/octet-stream',
      'X-Body-Type': bodyType,
    })
  },
}
