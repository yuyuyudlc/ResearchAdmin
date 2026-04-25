import { message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { requestJSON } from '../../../shared/api'
import { clearAuthSession, getAccessToken, getCurrentUser } from '../../../shared/authStorage'
import { useMock } from '../../../shared/config'
import { createMockDocument, listMockDocumentsByRole } from '../../../shared/mock/documentStore'
import { getMockTodosByRole, mockScenarios } from '../../../shared/mock/documents'
import type { AuthUser, UserRole } from '../../../shared/types/auth'
import type { DashboardStats, DocumentItem, TodoItem } from '../../../shared/types/document'

const stageOptions = ['全部阶段', '立项阶段', '实验阶段', '分析阶段', '归档阶段'] as const

type StageOption = (typeof stageOptions)[number]

export interface CreateDocumentValues {
  title: string
  projectName: string
  stage: string
  tags: string[]
  summary: string
}

export interface UploadDocumentValues extends CreateDocumentValues {
  fileName: string
}

export function useHome() {
  const navigate = useNavigate()

  const [user] = useState<AuthUser | null>(() => getCurrentUser())
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('mock')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [stage, setStage] = useState<StageOption>('全部阶段')
  const [mockRole, setMockRole] = useState<UserRole>(user?.role ?? 'member')
  const [createOpen, setCreateOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const handleLogout = useCallback(() => {
    clearAuthSession()
    navigate('/login', { replace: true })
  }, [navigate])

  const loadMockData = useCallback(
    (role: UserRole) => {
      setDocuments(listMockDocumentsByRole(role))
      setTodos(getMockTodosByRole(role))
      setDataSource('mock')
    },
    [setDocuments, setTodos],
  )

  const loadDocuments = useCallback(async () => {
    if (useMock) {
      loadMockData(mockRole)
      return
    }

    const token = getAccessToken()
    if (!token) {
      handleLogout()
      return
    }

    setLoading(true)

    try {
      const response = await requestJSON<unknown>('/api/v1/documents?page=1&pageSize=20', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const normalized = normalizeDocuments(response.data)
      if (normalized.length === 0) {
        loadMockData(mockRole)
        return
      }

      setDocuments(normalized)
      setDataSource('live')
    } catch {
      loadMockData(mockRole)
      message.warning('后端文档接口不可用，已自动切回 Mock 数据。')
    } finally {
      setLoading(false)
    }
  }, [handleLogout, loadMockData, mockRole])

  useEffect(() => {
    if (!getAccessToken()) {
      navigate('/login', { replace: true })
      return
    }

    const timer = window.setTimeout(() => {
      void loadDocuments()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loadDocuments, navigate])

  const filteredDocuments = useMemo(() => {
    const keywordValue = keyword.trim().toLowerCase()

    return documents.filter((item) => {
      const matchedStage = stage === '全部阶段' ? true : item.stage === stage
      if (!matchedStage) {
        return false
      }

      if (!keywordValue) {
        return true
      }

      return [item.title, item.projectName, item.ownerName, item.summary].some((value) =>
        value.toLowerCase().includes(keywordValue),
      )
    })
  }, [documents, keyword, stage])

  const stats = useMemo<DashboardStats>(() => {
    const editableCount = filteredDocuments.filter((item) => item.permissionLabel === '可编辑').length
    const projectCount = new Set(filteredDocuments.map((item) => item.projectName)).size
    const pendingCount = todos.filter((item) => item.status !== '已完成').length

    return {
      totalDocs: filteredDocuments.length,
      editableDocs: editableCount,
      activeProjects: projectCount,
      pendingTasks: pendingCount,
    }
  }, [filteredDocuments, todos])

  const handleCreateDocument = useCallback(
    (values: CreateDocumentValues) => {
      createMockDocument(
        {
          title: values.title,
          projectName: values.projectName,
          stage: values.stage,
          ownerName: user?.displayName || '当前用户',
          permissionLabel: '可编辑',
          status: '进行中',
          summary: values.summary || '暂无摘要',
          tags: values.tags,
          docType: 'rich_text',
          canDownload: true,
          canShare: true,
          commentCount: 0,
          sizeLabel: '120 KB',
          lastOperator: user?.displayName || '当前用户',
        },
        mockRole,
      )

      setCreateOpen(false)
      loadMockData(mockRole)
      message.success('新建文档成功（Mock）')
    },
    [loadMockData, mockRole, user],
  )

  const handleUploadDocument = useCallback(
    (values: UploadDocumentValues) => {
      createMockDocument(
        {
          title: values.title,
          projectName: values.projectName,
          stage: values.stage,
          ownerName: user?.displayName || '当前用户',
          permissionLabel: '可编辑',
          status: '待审核',
          summary: values.summary || `上传文件：${values.fileName}`,
          tags: values.tags,
          docType: 'file',
          canDownload: true,
          canShare: true,
          commentCount: 0,
          sizeLabel: '1.0 MB',
          lastOperator: user?.displayName || '当前用户',
        },
        mockRole,
      )

      setUploadOpen(false)
      loadMockData(mockRole)
      message.success(`文件 ${values.fileName} 已上传（Mock）`)
    },
    [loadMockData, mockRole, user],
  )

  const openEditor = useCallback(
    (doc: DocumentItem) => {
      navigate(`/documents/${doc.id}/edit`)
    },
    [navigate],
  )

  const showSyncHint = useCallback(() => {
    message.info('文档同步已触发')
  }, [])

  return {
    user,
    loading,
    documents: filteredDocuments,
    dataSource,
    stats,
    todos,
    keyword,
    stage,
    stageOptions,
    mockRole,
    mockScenarios,
    createOpen,
    uploadOpen,
    setKeyword,
    setStage,
    setCreateOpen,
    setUploadOpen,
    handleLogout,
    loadDocuments,
    showSyncHint,
    setMockRole: (role: UserRole) => {
      setMockRole(role)
      if (useMock) {
        loadMockData(role)
      }
    },
    openEditor,
    handleCreateDocument,
    handleUploadDocument,
  }
}

function normalizeDocuments(payload: unknown) {
  const rows = pickRows(payload)

  return rows.map((row, index) => {
    const source = row as Record<string, unknown>
    const id = readNumber(source.id) ?? index + 1
    const title = readString(source.title) ?? '未命名文档'
    const projectName =
      readString(source.projectName) ?? readString(source.project_name) ?? '未分配项目'
    const ownerName =
      readString(source.ownerName) ??
      readString(source.owner_name) ??
      readString(source.principalName) ??
      '未指定'
    const stage = readString(source.stage) ?? '未分类'
    const status = readString(source.status) ?? '进行中'
    const permissionLabel = permissionBitToLabel(readNumber(source.permissionBit))
    const updatedAt = formatDate(readString(source.updatedAt) ?? readString(source.updated_at))

    return {
      id,
      title,
      projectName,
      ownerName,
      stage,
      status,
      permissionLabel,
      updatedAt,
      summary: readString(source.summary) ?? '暂无摘要',
      tags: [],
      docType: 'file' as const,
      canDownload: true,
      canShare: permissionLabel === '可编辑',
      versionCount: readNumber(source.versionCount) ?? 1,
      commentCount: readNumber(source.commentCount) ?? 0,
      sizeLabel: readString(source.sizeLabel) ?? '未知',
      lastOperator: readString(source.lastOperator) ?? ownerName,
    }
  })
}

function pickRows(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, unknown>
    const items = source.items
    if (Array.isArray(items)) {
      return items
    }

    const list = source.list
    if (Array.isArray(list)) {
      return list
    }
  }

  return []
}

function permissionBitToLabel(permissionBit: number | null) {
  if (permissionBit === null) {
    return '只读'
  }
  if ((permissionBit & 2) === 2) {
    return '可编辑'
  }
  return '只读'
}

function formatDate(value: string | null) {
  if (!value) {
    return '未知'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}
