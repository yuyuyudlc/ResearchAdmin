import type { TagProps } from 'antd'

export function useTodoPanel() {
  const priorityColorMap: Record<string, TagProps['color']> = {
    高: 'error',
    中: 'warning',
    低: 'default',
  }

  const statusColorMap: Record<string, TagProps['color']> = {
    待处理: 'warning',
    进行中: 'processing',
    已完成: 'success',
  }

  return {
    priorityColorMap,
    statusColorMap,
  }
}
