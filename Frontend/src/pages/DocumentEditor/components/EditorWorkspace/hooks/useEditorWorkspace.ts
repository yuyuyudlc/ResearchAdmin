import type { DocumentItem } from '../../../../../shared/types/document'

export function useEditorWorkspace(document: DocumentItem | null) {
  return {
    initialValues: document
      ? {
          title: document.title,
          projectName: document.projectName,
          stage: document.stage,
          summary: document.summary,
          tags: document.tags,
        }
      : undefined,
    stageOptions: ['立项阶段', '实验阶段', '分析阶段', '归档阶段'],
    statusOptions: ['进行中', '待审核', '已归档'],
  }
}
