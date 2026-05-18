import { useCallback, useRef, useState } from 'react'
import { workspaceService } from '../services/workspace'
import { documentService } from '../services/document'
import type { TreeNode } from '../contexts/PrivateSpaceContext'

interface WorkspaceTreeState {
  tree: TreeNode[]
  loading: boolean
}

async function fetchSubtree(
  workspaceId: string,
  parentId: string | null,
): Promise<TreeNode[]> {
  const res = await workspaceService.getDirectory(
    workspaceId,
    parentId || undefined,
  )
  const items = res.data.items
  return Promise.all(
    items.map(async (item) => {
      const node: TreeNode = { ...item, children: [], loaded: true }
      if (item.hasChildren) {
        node.children = await fetchSubtree(workspaceId, item.id)
      }
      return node
    }),
  )
}

/**
 * 按 workspaceId 缓存并加载文档树
 */
export function useWorkspaceTrees() {
  const [map, setMap] = useState<Record<string, WorkspaceTreeState>>({})
  const inFlight = useRef<Set<string>>(new Set())

  const loadTree = useCallback(async (workspaceId: string, force = false) => {
    if (!force && map[workspaceId]?.tree && !inFlight.current.has(workspaceId)) return
    if (inFlight.current.has(workspaceId)) return
    inFlight.current.add(workspaceId)
    setMap((prev) => ({
      ...prev,
      [workspaceId]: { tree: prev[workspaceId]?.tree ?? [], loading: true },
    }))
    try {
      const tree = await fetchSubtree(workspaceId, null)
      setMap((prev) => ({ ...prev, [workspaceId]: { tree, loading: false } }))
    } catch {
      setMap((prev) => ({ ...prev, [workspaceId]: { tree: [], loading: false } }))
    } finally {
      inFlight.current.delete(workspaceId)
    }
    // 注意：这里故意不把 map 加入依赖，避免重复 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = useCallback((workspaceId: string) => loadTree(workspaceId, true), [loadTree])

  const moveDocument = useCallback(
    async (workspaceId: string, documentId: string, parentId: string | null, sortOrder: number) => {
      await documentService.move(documentId, { parentId, sortOrder })
      await loadTree(workspaceId, true)
    },
    [loadTree],
  )

  const createDocument = useCallback(
    async (
      workspaceId: string,
      parentId: string | null,
      data: { title: string; docType: string; summary?: string },
    ) => {
      const res = await documentService.create(workspaceId, {
        parentId,
        title: data.title.trim(),
        summary: data.summary?.trim() || '',
        docType: data.docType || 'rich_text',
      })
      await loadTree(workspaceId, true)
      return res.data
    },
    [loadTree],
  )

  const removeDocument = useCallback(
    async (workspaceId: string, documentId: string) => {
      await documentService.delete(documentId)
      await loadTree(workspaceId, true)
    },
    [loadTree],
  )

  return {
    map,
    loadTree,
    refresh,
    moveDocument,
    createDocument,
    removeDocument,
  }
}