import { get, patch, post, putBinary } from './api'
import type {
  SpreadsheetBlockResponse,
  SpreadsheetConfig,
  SpreadsheetFilter,
  SpreadsheetRecord,
  SpreadsheetSort,
} from './types'

interface UpdateSpreadsheetCellRequest {
  rowIndex: number
  field: string
  value: string | number | null
}

interface UpdateSpreadsheetViewRequest {
  title?: string
  mode?: 'pivot' | 'table'
  config?: SpreadsheetConfig
  filters?: SpreadsheetFilter[]
  sort?: SpreadsheetSort
  activeMetric?: string | null
}

interface CreateSpreadsheetRecordRequest {
  record?: Record<string, string | number | null | undefined>
}

interface SpreadsheetExportResponse {
  filename: string
  rows: SpreadsheetRecord[]
  columns: string[]
}

export const spreadsheetService = {
  getBlock(documentId: string, blockId: string) {
    return get<SpreadsheetBlockResponse>(`/documents/${documentId}/spreadsheets/${blockId}`)
  },

  updateView(documentId: string, blockId: string, data: UpdateSpreadsheetViewRequest) {
    return patch<SpreadsheetBlockResponse>(`/documents/${documentId}/spreadsheets/${blockId}`, data)
  },

  updateCell(documentId: string, blockId: string, data: UpdateSpreadsheetCellRequest) {
    return patch<SpreadsheetBlockResponse>(`/documents/${documentId}/spreadsheets/${blockId}/cell`, data)
  },

  createRecord(documentId: string, blockId: string, data: CreateSpreadsheetRecordRequest = {}) {
    return post<SpreadsheetBlockResponse>(`/documents/${documentId}/spreadsheets/${blockId}/records`, data)
  },

  putSnapshot(documentId: string, blockId: string, payload: Uint8Array) {
    return putBinary<{ size: number }>(`/documents/${documentId}/spreadsheets/${blockId}/body`, payload, {
      'Content-Type': 'application/octet-stream',
    })
  },

  exportView(documentId: string, blockId: string) {
    return get<SpreadsheetExportResponse>(`/documents/${documentId}/spreadsheets/${blockId}/export`)
  },
}