import { message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getCurrentUser } from '../../../shared/authStorage'
import { useMock } from '../../../shared/config'
import { getMockDocumentById, updateMockDocument } from '../../../shared/mock/documentStore'
import type { DocumentItem } from '../../../shared/types/document'

export interface DocumentEditValues {
  title: string
  projectName: string
  stage: string
  summary: string
  tags: string[]
}

export interface ShareEntry {
  id: number
  target: string
  permission: '可编辑' | '只读'
}

export function useDocumentEditor() {
  const navigate = useNavigate()
  const { documentId } = useParams()

  const [loading, setLoading] = useState(true)
  const [document, setDocument] = useState<DocumentItem | null>(null)
  const [status, setStatus] = useState<DocumentItem['status']>('进行中')
  const [shareList, setShareList] = useState<ShareEntry[]>([
    { id: 1, target: '课题组A', permission: '可编辑' },
    { id: 2, target: '王晨', permission: '只读' },
  ])
  const [shareTarget, setShareTarget] = useState('')
  const [sharePermission, setSharePermission] = useState<'可编辑' | '只读'>('只读')

  useEffect(() => {
    const id = Number(documentId)
    if (!id) {
      navigate('/', { replace: true })
      return
    }

    const timer = window.setTimeout(() => {
      if (!useMock) {
        setLoading(false)
        message.info('当前仅实现 Mock 编辑页流程，后端模式后续补齐。')
        return
      }

      const doc = getMockDocumentById(id)
      if (!doc) {
        setLoading(false)
        message.error('文档不存在或不可访问')
        navigate('/', { replace: true })
        return
      }

      setDocument(doc)
      setStatus(doc.status)
      setLoading(false)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [documentId, navigate])

  const historyRows = useMemo(() => {
    if (!document) {
      return []
    }
    const count = Math.max(document.versionCount, 3)
    return Array.from({ length: Math.min(8, count) }).map((_, index) => ({
      id: `${document.id}-${index + 1}`,
      versionNo: count - index,
      summary: index === 0 ? '更新文档元数据与状态' : `历史快照 ${count - index}`,
      operator: index === 0 ? document.lastOperator : '协作者',
      createdAt: `2026-04-${`${24 - index}`.padStart(2, '0')} 14:${`${12 + index}`.padStart(2, '0')}`,
    }))
  }, [document])

  const saveDocument = useCallback(
    (values: DocumentEditValues) => {
      if (!document) {
        return
      }

      const user = getCurrentUser()
      const updated = updateMockDocument(document.id, {
        title: values.title,
        projectName: values.projectName,
        stage: values.stage,
        summary: values.summary,
        tags: values.tags,
        status,
        lastOperator: user?.displayName || user?.username || '当前用户',
      })

      if (!updated) {
        message.error('保存失败')
        return
      }

      setDocument(updated)
      message.success('文档已保存（Mock）')
    },
    [document, status],
  )

  const changeStatus = useCallback(
    (nextStatus: DocumentItem['status']) => {
      if (!document) {
        return
      }

      setStatus(nextStatus)
      const user = getCurrentUser()
      const updated = updateMockDocument(document.id, {
        status: nextStatus,
        lastOperator: user?.displayName || user?.username || '当前用户',
      })
      if (updated) {
        setDocument(updated)
      }
      message.success(`状态已变更为${nextStatus}（Mock）`)
    },
    [document],
  )

  const addShare = useCallback(() => {
    const target = shareTarget.trim()
    if (!target) {
      message.warning('请输入共享对象')
      return
    }

    setShareList((prev) => [
      ...prev,
      { id: Date.now(), target, permission: sharePermission },
    ])
    setShareTarget('')
    setSharePermission('只读')
    message.success('共享权限已更新（Mock）')
  }, [sharePermission, shareTarget])

  const removeShare = useCallback((id: number) => {
    setShareList((prev) => prev.filter((item) => item.id !== id))
    message.success('共享对象已移除（Mock）')
  }, [])

  return {
    loading,
    document,
    status,
    historyRows,
    shareList,
    shareTarget,
    sharePermission,
    setShareTarget,
    setSharePermission,
    saveDocument,
    changeStatus,
    addShare,
    removeShare,
    goBack: () => navigate('/'),
  }
}
