import type { DocumentItem } from '../../../../../shared/types/document'

export function useHistoryDrawer(document: DocumentItem | null) {
  if (!document) {
    return []
  }

  const count = Math.max(document.versionCount, 3)

  return Array.from({ length: Math.min(count, 8) }).map((_, index) => ({
    id: `${document.id}-${index + 1}`,
    versionNo: count - index,
    operator: index === 0 ? document.lastOperator : '协作者',
    timestamp: `2026-04-${`${24 - index}`.padStart(2, '0')} 14:${`${10 + index}`.padStart(2, '0')}`,
    summary: index === 0 ? '补充实验结论并同步评论处理状态' : `历史快照变更记录 ${index + 1}`,
  }))
}
