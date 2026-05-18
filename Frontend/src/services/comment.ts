import { get, post, patch } from './api'
import type {
  CommentListResponse,
  Comment,
  CreateCommentRequest,
  UpdateCommentStatusRequest,
} from './types'

export const commentService = {
  list(documentId: string, status?: string) {
    const params = status ? `?status=${status}` : ''
    return get<CommentListResponse>(`/documents/${documentId}/comments${params}`)
  },

  create(documentId: string, data: CreateCommentRequest) {
    return post<Comment>(`/documents/${documentId}/comments`, data)
  },

  reply(commentId: string, data: CreateCommentRequest) {
    return post<Comment>(`/comments/${commentId}/replies`, data)
  },

  updateStatus(commentId: string, data: UpdateCommentStatusRequest) {
    return patch<Comment>(`/comments/${commentId}/status`, data)
  },
}