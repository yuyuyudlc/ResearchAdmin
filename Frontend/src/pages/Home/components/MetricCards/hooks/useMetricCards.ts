import type { DashboardStats } from '../../../../../shared/types/document'

export function useMetricCards(stats: DashboardStats) {
  return [
    {
      key: 'total',
      label: '文档总量',
      value: stats.totalDocs,
      note: '当前可访问文档',
    },
    {
      key: 'editable',
      label: '可编辑文档',
      value: stats.editableDocs,
      note: '具备编辑权限',
    },
    {
      key: 'projects',
      label: '活跃项目',
      value: stats.activeProjects,
      note: '正在推进中的项目',
    },
    {
      key: 'tasks',
      label: '待处理事项',
      value: stats.pendingTasks,
      note: '待审核或待确认',
    },
  ]
}
