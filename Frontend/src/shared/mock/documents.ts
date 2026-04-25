import type { UserRole } from '../types/auth'
import type { DocumentItem, MockScenario, TodoItem } from '../types/document'

export interface MockDocument extends DocumentItem {
  visibleRoles: UserRole[]
}

export const mockScenarios: MockScenario[] = [
  { role: 'admin', label: '管理员视角', description: '可见全部文档，可管理共享与流程配置。' },
  { role: 'owner', label: '文档拥有者视角', description: '可管理本人文档共享和历史恢复。' },
  { role: 'member', label: '普通成员视角', description: '可访问被授权文档，受权限严格约束。' },
]

const allMockDocuments: MockDocument[] = [
  {
    id: 10001,
    title: '课题一阶段实验日志',
    projectName: '智能材料研究',
    stage: '实验阶段',
    ownerName: '李文',
    permissionLabel: '可编辑',
    status: '进行中',
    updatedAt: '2026-04-22',
    summary: '记录材料性能测试与实验过程变更信息。',
    tags: ['实验', '材料'],
    docType: 'rich_text',
    canDownload: true,
    canShare: true,
    versionCount: 18,
    commentCount: 9,
    sizeLabel: '860 KB',
    lastOperator: '李文',
    visibleRoles: ['admin', 'owner', 'member'],
  },
  {
    id: 10002,
    title: '样本参数对比报告',
    projectName: '先进制造分析',
    stage: '分析阶段',
    ownerName: '王晨',
    permissionLabel: '只读',
    status: '已归档',
    updatedAt: '2026-04-20',
    summary: '阶段性参数对比结果，不允许普通成员修改。',
    tags: ['分析', '参数'],
    docType: 'file',
    canDownload: true,
    canShare: false,
    versionCount: 7,
    commentCount: 2,
    sizeLabel: '2.1 MB',
    lastOperator: '王晨',
    visibleRoles: ['admin', 'owner', 'member'],
  },
  {
    id: 10003,
    title: '2026 年度经费申请材料',
    projectName: '科研管理中心',
    stage: '立项阶段',
    ownerName: '陈毅',
    permissionLabel: '可编辑',
    status: '待审核',
    updatedAt: '2026-04-18',
    summary: '年度预算、里程碑与资源申请文档。',
    tags: ['经费', '立项'],
    docType: 'file',
    canDownload: true,
    canShare: true,
    versionCount: 11,
    commentCount: 5,
    sizeLabel: '1.4 MB',
    lastOperator: '陈毅',
    visibleRoles: ['admin', 'owner'],
  },
  {
    id: 10004,
    title: '实验室共享数据清单',
    projectName: '智能材料研究',
    stage: '归档阶段',
    ownerName: '李文',
    permissionLabel: '可编辑',
    status: '进行中',
    updatedAt: '2026-04-15',
    summary: '归档数据目录与访问说明。',
    tags: ['归档', '共享'],
    docType: 'rich_text',
    canDownload: true,
    canShare: true,
    versionCount: 5,
    commentCount: 3,
    sizeLabel: '520 KB',
    lastOperator: '李文',
    visibleRoles: ['admin', 'owner'],
  },
  {
    id: 10005,
    title: '成员周报汇总（只读）',
    projectName: '科研团队 A 组',
    stage: '分析阶段',
    ownerName: '项目秘书',
    permissionLabel: '只读',
    status: '进行中',
    updatedAt: '2026-04-23',
    summary: '每周进展归档给成员查看，禁止修改。',
    tags: ['周报', '团队'],
    docType: 'rich_text',
    canDownload: false,
    canShare: false,
    versionCount: 22,
    commentCount: 14,
    sizeLabel: '390 KB',
    lastOperator: '项目秘书',
    visibleRoles: ['admin', 'member'],
  },
]

export function getMockDocumentCatalog() {
  return allMockDocuments.map((item) => ({
    ...item,
    tags: [...item.tags],
    visibleRoles: [...item.visibleRoles],
  }))
}

export function getMockDocumentsByRole(role: UserRole) {
  return allMockDocuments.filter((item) => item.visibleRoles.includes(role))
}

export function getMockTodosByRole(role: UserRole): TodoItem[] {
  if (role === 'admin') {
    return [
      {
        id: 1,
        title: '审查共享权限异常记录',
        priority: '高',
        status: '待处理',
        dueDate: '2026-04-26',
        relatedDocTitle: '实验室共享数据清单',
      },
      {
        id: 2,
        title: '确认备份任务状态',
        priority: '中',
        status: '进行中',
        dueDate: '2026-04-27',
        relatedDocTitle: '系统审计总览',
      },
    ]
  }

  if (role === 'owner') {
    return [
      {
        id: 3,
        title: '处理经费材料评审意见',
        priority: '高',
        status: '待处理',
        dueDate: '2026-04-26',
        relatedDocTitle: '2026 年度经费申请材料',
      },
      {
        id: 4,
        title: '完善实验记录版本说明',
        priority: '中',
        status: '进行中',
        dueDate: '2026-04-28',
        relatedDocTitle: '课题一阶段实验日志',
      },
    ]
  }

  return [
    {
      id: 5,
      title: '补充周报评论回复',
      priority: '中',
      status: '待处理',
      dueDate: '2026-04-26',
      relatedDocTitle: '成员周报汇总（只读）',
    },
    {
      id: 6,
      title: '确认实验日志引用数据',
      priority: '低',
      status: '进行中',
      dueDate: '2026-04-29',
      relatedDocTitle: '课题一阶段实验日志',
    },
  ]
}
