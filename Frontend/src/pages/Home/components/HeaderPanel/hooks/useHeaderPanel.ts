import type { SelectProps } from 'antd'
import type { MockScenario } from '../../../../../shared/types/document'

export function useHeaderPanel(stageOptions: readonly string[], scenarios: MockScenario[]) {
  const selectOptions: SelectProps['options'] = stageOptions.map((item) => ({
    value: item,
    label: item,
  }))
  const scenarioOptions: SelectProps['options'] = scenarios.map((item) => ({
    value: item.role,
    label: item.label,
  }))

  return {
    selectOptions,
    scenarioOptions,
    title: '科研文档工作台',
    subtitle: '聚焦文档流转、权限管理与协作效率',
  }
}
