import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workspaceService } from '../../../services/workspace'
import { documentService } from '../../../services/document'
import type {
  CreateDocumentRequest,
  DocumentNode,
  WorkspaceDirectoryResponse,
} from '../../../services/types'

export interface CreateDocFormValues {
  title: string
  summary?: string
  docType: string
}

export function useWorkspaceDetail(workspaceId: string | undefined) {
  const navigate = useNavigate()
  const [directory, setDirectory] = useState<WorkspaceDirectoryResponse | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [pathStack, setPathStack] = useState<DocumentNode[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchDirectory = useCallback(
    async (targetParentId: string | null) => {
      if (!workspaceId) return
      setLoading(true)
      setError('')
      try {
        const res = await workspaceService.getDirectory(
          workspaceId,
          targetParentId || undefined,
        )
        setDirectory(res.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载目录失败')
        setDirectory(null)
      } finally {
        setLoading(false)
      }
    },
    [workspaceId],
  )

  useEffect(() => {
    fetchDirectory(parentId)
  }, [fetchDirectory, parentId])

  const enterFolder = (node: DocumentNode) => {
    setPathStack((prev) => [...prev, node])
    setParentId(node.id)
  }

  const goToRoot = () => {
    setPathStack([])
    setParentId(null)
  }

  const goToBreadcrumb = (index: number) => {
    if (index < 0) {
      goToRoot()
      return
    }
    const next = pathStack.slice(0, index + 1)
    setPathStack(next)
    setParentId(next[next.length - 1]?.id ?? null)
  }

  const refresh = () => fetchDirectory(parentId)

  const createDocument = async (values: CreateDocFormValues) => {
    if (!workspaceId) return
    setSubmitting(true)
    try {
      const payload: CreateDocumentRequest = {
        parentId,
        title: values.title.trim(),
        summary: values.summary?.trim() || '',
        docType: values.docType || 'rich_text',
      }
      const res = await documentService.create(workspaceId, payload)
      await fetchDirectory(parentId)
      return res.data
    } finally {
      setSubmitting(false)
    }
  }

  const uploadDocument = async (file: File) => {
    if (!workspaceId) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (parentId) {
        formData.append('parentId', parentId)
      }
      formData.append('title', file.name)
      const res = await documentService.upload(workspaceId, formData)
      await fetchDirectory(parentId)
      return res.data
    } finally {
      setSubmitting(false)
    }
  }

  const archive = async (documentId: string) => {
    await documentService.archive(documentId)
    await fetchDirectory(parentId)
  }

  const restore = async (documentId: string) => {
    await documentService.restore(documentId)
    await fetchDirectory(parentId)
  }

  const remove = async (documentId: string) => {
    await documentService.delete(documentId)
    await fetchDirectory(parentId)
  }

  const openDocument = (node: DocumentNode) => {
    navigate(`/documents/${node.id}`)
  }

  return {
    directory,
    parentId,
    pathStack,
    loading,
    submitting,
    error,
    refresh,
    enterFolder,
    goToRoot,
    goToBreadcrumb,
    createDocument,
    uploadDocument,
    archive,
    restore,
    remove,
    openDocument,
  }
}