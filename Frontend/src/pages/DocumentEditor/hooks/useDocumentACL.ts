import { useCallback, useEffect, useState, startTransition } from 'react'
import { aclService } from '../../../services/acl'
import type {
  ACLItem,
  CreateACLRequest,
  MyPermissionResponse,
  UpdateACLRequest,
} from '../../../services/types'

export function useDocumentACL(documentId: string | undefined) {
  const [items, setItems] = useState<ACLItem[]>([])
  const [permission, setPermission] = useState<MyPermissionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    setError('')
    try {
      const permRes = await aclService.myPermission(documentId).catch(() => null)
      if (permRes) {
        setPermission(permRes.data)
      }

      if (permRes?.data.canManage) {
        const listRes = await aclService.list(documentId)
        setItems(listRes.data.items)
      } else {
        setItems([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载权限失败')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    startTransition(() => {
      fetchAll()
    })
  }, [fetchAll])

  const createACL = async (data: CreateACLRequest) => {
    if (!documentId) return
    setSubmitting(true)
    try {
      await aclService.create(documentId, data)
      await fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  const updateACL = async (aclId: string, data: UpdateACLRequest) => {
    if (!documentId) return
    setSubmitting(true)
    try {
      await aclService.update(documentId, aclId, data)
      await fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  const removeACL = async (aclId: string) => {
    if (!documentId) return
    setSubmitting(true)
    try {
      await aclService.delete(documentId, aclId)
      await fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  return {
    items,
    permission,
    loading,
    submitting,
    error,
    refresh: fetchAll,
    createACL,
    updateACL,
    removeACL,
  }
}
