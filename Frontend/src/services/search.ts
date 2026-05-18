import { get } from './api'
import type { DocumentNode, SearchRequest } from './types'

export interface SearchResponse {
  items: DocumentNode[]
  total: number
  page: number
  pageSize: number
}

export const searchService = {
  documents(params: SearchRequest) {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.workspaceId) query.set('workspaceId', params.workspaceId)
    if (params.parentId) query.set('parentId', params.parentId)
    if (params.docType) query.set('docType', params.docType)
    if (params.ownerUserId) query.set('ownerUserId', params.ownerUserId)
    if (params.status) query.set('status', params.status)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const qs = query.toString()
    return get<SearchResponse>(`/search/documents${qs ? `?${qs}` : ''}`)
  },
}