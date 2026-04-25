import type { UserRole } from './auth'

export interface DocumentItem {
  id: number
  title: string
  projectName: string
  stage: string
  ownerName: string
  permissionLabel: string
  status: string
  updatedAt: string
  summary: string
  tags: string[]
  docType: 'rich_text' | 'file'
  canDownload: boolean
  canShare: boolean
  versionCount: number
  commentCount: number
  sizeLabel: string
  lastOperator: string
}

export interface DashboardStats {
  totalDocs: number
  editableDocs: number
  activeProjects: number
  pendingTasks: number
}

export interface TodoItem {
  id: number
  title: string
  priority: '高' | '中' | '低'
  status: '待处理' | '进行中' | '已完成'
  dueDate: string
  relatedDocTitle: string
}

export interface MockScenario {
  role: UserRole
  label: string
  description: string
}
