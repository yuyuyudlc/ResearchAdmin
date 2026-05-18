import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { workspaceService } from '../services/workspace'
import { documentService } from '../services/document'
import type {
  CreateDocumentRequest,
  DocumentNode,
  Workspace,
} from '../services/types'
import { useAuth } from './AuthContext'

export interface TreeNode extends DocumentNode {
  children: TreeNode[]
  loaded: boolean
}

interface PrivateSpaceContextType {
  workspace: Workspace | null
  tree: TreeNode[]
  loading: boolean
  error: string
  refresh: () => Promise<void>
  createDocument: (
    parentId: string | null,
    data: { title: string; docType: string; summary?: string },
  ) => Promise<DocumentNode | undefined>
  moveDocument: (
    documentId: string,
    parentId: string | null,
    sortOrder: number,
  ) => Promise<void>
  removeDocument: (documentId: string) => Promise<void>
}

const PrivateSpaceContext = createContext<PrivateSpaceContextType | null>(null)

async function fetchSubtree(
  workspaceId: string,
  parentId: string | null,
): Promise<TreeNode[]> {
  const res = await workspaceService.getDirectory(
    workspaceId,
    parentId || undefined,
  )
  const items = res.data.items
  const nodes: TreeNode[] = await Promise.all(
    items.map(async (item) => {
      const node: TreeNode = { ...item, children: [], loaded: true }
      if (item.hasChildren) {
        node.children = await fetchSubtree(workspaceId, item.id)
      }
      return node
    }),
  )
  return nodes
}

export function PrivateSpaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    if (!user) {
      setWorkspace(null)
      setTree([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const list = await workspaceService.list()
      const owned = list.data.items.find((w) => w.role === 'owner')
        || list.data.items[0]
        || null
      if (!owned) {
        setWorkspace(null)
        setTree([])
        return
      }
      setWorkspace(owned)
      const nodes = await fetchSubtree(owned.id, null)
      setTree(nodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载私人空间失败')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const refresh = async () => {
    await loadAll()
  }

  const createDocument = async (
    parentId: string | null,
    data: { title: string; docType: string; summary?: string },
  ) => {
    if (!workspace) return undefined
    const payload: CreateDocumentRequest = {
      parentId,
      title: data.title.trim(),
      summary: data.summary?.trim() || '',
      docType: data.docType || 'rich_text',
    }
    const res = await documentService.create(workspace.id, payload)
    await loadAll()
    return res.data
  }

  const moveDocument = async (
    documentId: string,
    parentId: string | null,
    sortOrder: number,
  ) => {
    await documentService.move(documentId, { parentId, sortOrder })
    await loadAll()
  }

  const removeDocument = async (documentId: string) => {
    await documentService.delete(documentId)
    await loadAll()
  }

  return (
    <PrivateSpaceContext.Provider
      value={{
        workspace,
        tree,
        loading,
        error,
        refresh,
        createDocument,
        moveDocument,
        removeDocument,
      }}
    >
      {children}
    </PrivateSpaceContext.Provider>
  )
}

export function usePrivateSpace(): PrivateSpaceContextType {
  const ctx = useContext(PrivateSpaceContext)
  if (!ctx) throw new Error('usePrivateSpace must be used within PrivateSpaceProvider')
  return ctx
}

/**
 * 工具：在树中按 id 查找节点的父节点和索引
 */
export function findNodeInTree(
  tree: TreeNode[],
  id: string,
  parent: TreeNode | null = null,
): { node: TreeNode; parent: TreeNode | null; index: number } | null {
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i]
    if (node.id === id) return { node, parent, index: i }
    const found = findNodeInTree(node.children, id, node)
    if (found) return found
  }
  return null
}

/**
 * 判断 target 是否为 source 的子孙（防止把节点拖到自己内部）
 */
export function isDescendant(source: TreeNode, targetId: string): boolean {
  if (source.id === targetId) return true
  for (const child of source.children) {
    if (isDescendant(child, targetId)) return true
  }
  return false
}