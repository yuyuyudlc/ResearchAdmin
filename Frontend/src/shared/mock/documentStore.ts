import type { UserRole } from '../types/auth'
import type { DocumentItem } from '../types/document'
import { getMockDocumentCatalog, type MockDocument } from './documents'

const STORAGE_KEY = 'research_admin_mock_document_catalog'

let catalogCache: MockDocument[] | null = null

function ensureCatalog() {
  if (catalogCache) {
    return catalogCache
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDocument[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        catalogCache = parsed
        return catalogCache
      }
    } catch {
      // ignore invalid storage and fallback to seed data
    }
  }

  catalogCache = getMockDocumentCatalog()
  persistCatalog()
  return catalogCache
}

function persistCatalog() {
  if (!catalogCache) {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogCache))
}

function toDocumentItem(doc: MockDocument): DocumentItem {
  return {
    ...doc,
    tags: [...doc.tags],
  }
}

export function listMockDocumentsByRole(role: UserRole) {
  return ensureCatalog()
    .filter((doc) => doc.visibleRoles.includes(role))
    .map(toDocumentItem)
}

export function getMockDocumentById(id: number) {
  const matched = ensureCatalog().find((doc) => doc.id === id)
  return matched ? toDocumentItem(matched) : null
}

export function createMockDocument(payload: Omit<DocumentItem, 'id' | 'updatedAt' | 'versionCount'>, role: UserRole) {
  const now = new Date()
  const nextId = now.getTime()
  const dateLabel = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`

  const visibleRoles: UserRole[] =
    role === 'admin' ? ['admin', 'owner', 'member'] : role === 'owner' ? ['admin', 'owner'] : ['admin', 'member']

  const next: MockDocument = {
    ...payload,
    id: nextId,
    updatedAt: dateLabel,
    versionCount: 1,
    visibleRoles,
  }

  ensureCatalog().unshift(next)
  persistCatalog()
  return toDocumentItem(next)
}

export function updateMockDocument(id: number, patch: Partial<DocumentItem>) {
  const catalog = ensureCatalog()
  const index = catalog.findIndex((doc) => doc.id === id)
  if (index < 0) {
    return null
  }

  const existing = catalog[index]
  const now = new Date()
  const dateLabel = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`

  const merged: MockDocument = {
    ...existing,
    ...patch,
    id: existing.id,
    visibleRoles: existing.visibleRoles,
    updatedAt: dateLabel,
  }

  if (patch.title || patch.summary || patch.stage || patch.projectName || patch.status) {
    merged.versionCount = existing.versionCount + 1
  }

  catalog[index] = merged
  persistCatalog()
  return toDocumentItem(merged)
}

export function resetMockDocumentStore() {
  catalogCache = getMockDocumentCatalog()
  persistCatalog()
}
