import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Divider, Empty, Form, Input, Modal, Select, Space, Tag, Typography } from 'antd'
import Icon from '../../../../components/Icon'
import type {
  SpreadsheetBlockState,
  SpreadsheetConfig,
  SpreadsheetFilter,
  SpreadsheetMetaField,
} from '../../../../services'
import styles from './style/index.module.css'

const { Text } = Typography

type DragGroup = 'rows' | 'columns' | 'values' | 'palette'

interface Props {
  spreadsheet: SpreadsheetBlockState | null
  loading: boolean
  error: string | null
  canEditDocument: boolean
  onInsertSpreadsheetBlock: () => void
  onPatchSpreadsheetBlock: (patch: Partial<SpreadsheetBlockState>) => Promise<void> | void
  onRefreshSpreadsheet: () => void
  onExportSpreadsheet: () => void
}

interface FilterDraft {
  field: string
  operator: SpreadsheetFilter['operator']
  value: string
}

interface NewFieldDraft {
  fieldName: string
  fieldType: 'dimension' | 'metric'
}

function cloneConfig(config: SpreadsheetConfig): SpreadsheetConfig {
  return {
    rows: [...config.rows],
    columns: [...config.columns],
    values: [...config.values],
    meta: [...config.meta],
  }
}

function removeField(config: SpreadsheetConfig, field: string): SpreadsheetConfig {
  return {
    ...cloneConfig(config),
    rows: config.rows.filter((item) => item !== field),
    columns: config.columns.filter((item) => item !== field),
    values: config.values.filter((item) => item !== field),
  }
}

function moveField(config: SpreadsheetConfig, field: string, target: Exclude<DragGroup, 'palette'>): SpreadsheetConfig {
  const stripped = removeField(config, field)
  if (target === 'rows') {
    return { ...stripped, rows: [...stripped.rows, field] }
  }
  if (target === 'columns') {
    return { ...stripped, columns: [...stripped.columns, field] }
  }
  return { ...stripped, values: [...stripped.values, field] }
}

function getFieldLabel(meta: SpreadsheetMetaField[], field: string): string {
  return meta.find((item) => item.field === field)?.name || field
}

function buildFieldKey(fieldName: string, existingFields: string[]): string {
  const base = fieldName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const fallback = `field_${Date.now().toString(36)}`
  const initial = base || fallback
  let candidate = initial
  let counter = 1

  while (existingFields.includes(candidate)) {
    candidate = `${initial}_${counter}`
    counter += 1
  }

  return candidate
}

export function PivotTableSidebar({
  spreadsheet,
  loading,
  error,
  canEditDocument,
  onInsertSpreadsheetBlock,
  onPatchSpreadsheetBlock,
  onRefreshSpreadsheet,
  onExportSpreadsheet,
}: Props) {
  const [fieldForm] = Form.useForm<NewFieldDraft>()
  const [dragField, setDragField] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<DragGroup | null>(null)
  const [filterDraft, setFilterDraft] = useState<FilterDraft>({ field: '', operator: 'contains', value: '' })
  const [newFieldOpen, setNewFieldOpen] = useState(false)

  const fieldCatalog = useMemo(() => spreadsheet?.config.meta || [], [spreadsheet])

  useEffect(() => {
    if (!spreadsheet) {
      setFilterDraft({ field: '', operator: 'contains', value: '' })
      return
    }

    setFilterDraft((prev) => ({
      field: prev.field || spreadsheet.config.meta[0]?.field || '',
      operator: prev.operator,
      value: prev.value,
    }))
  }, [spreadsheet])

  const patchConfig = (updater: (config: SpreadsheetConfig) => SpreadsheetConfig) => {
    if (!spreadsheet) {
      return
    }
    const nextConfig = updater(spreadsheet.config)
    void onPatchSpreadsheetBlock({ config: nextConfig })
  }

  const patchBlock = (patch: Partial<SpreadsheetBlockState>) => {
    if (!spreadsheet) {
      return
    }
    void onPatchSpreadsheetBlock(patch)
  }

  const openNewFieldModal = () => {
    fieldForm.setFieldsValue({
      fieldName: '',
      fieldType: 'dimension',
    })
    setNewFieldOpen(true)
  }

  const handleCreateField = async () => {
    if (!spreadsheet) {
      return
    }

    try {
      const values = await fieldForm.validateFields()
      const nextName = values.fieldName.trim()
      const nextField = buildFieldKey(nextName, spreadsheet.config.meta.map((item) => item.field))

      patchConfig((config) => {
        const nextMeta = [
          ...config.meta.filter((item) => item.field !== nextField),
          {
            field: nextField,
            name: nextName,
            type: values.fieldType,
          },
        ]

        const nextConfig: SpreadsheetConfig = {
          ...cloneConfig(config),
          meta: nextMeta,
          values: values.fieldType === 'metric' && !config.values.includes(nextField)
            ? [...config.values, nextField]
            : config.values,
        }

        return nextConfig
      })

      setNewFieldOpen(false)
      fieldForm.resetFields()
    } catch {
      // form validation already surfaced inline
    }
  }

  const handleDropGroup = (group: Exclude<DragGroup, 'palette'>) => {
    if (!dragField || !spreadsheet || !canEditDocument || !dragSource) {
      return
    }
    patchConfig((config) => moveField(config, dragField, group))
    setDragField(null)
    setDragSource(null)
  }

  const handleRemoveField = (field: string, group: Exclude<DragGroup, 'palette'>) => {
    if (!spreadsheet || !canEditDocument) {
      return
    }
    patchConfig((config) => {
      const next = cloneConfig(config)
      if (group === 'rows') next.rows = next.rows.filter((item) => item !== field)
      if (group === 'columns') next.columns = next.columns.filter((item) => item !== field)
      if (group === 'values') next.values = next.values.filter((item) => item !== field)
      return next
    })
  }

  const handleAddFilter = () => {
    if (!spreadsheet || !filterDraft.field || !filterDraft.value.trim() || !canEditDocument) {
      return
    }

    const nextFilters = [...spreadsheet.filters, { ...filterDraft, value: filterDraft.value.trim() }]
    patchBlock({ filters: nextFilters })
    setFilterDraft((prev) => ({ ...prev, value: '' }))
  }

  const handleRemoveFilter = (index: number) => {
    if (!spreadsheet || !canEditDocument) {
      return
    }
    const nextFilters = spreadsheet.filters.filter((_, itemIndex) => itemIndex !== index)
    patchBlock({ filters: nextFilters })
  }

  if (!spreadsheet) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <div>
            <span className={styles.title}>多维表格</span>
            <div className={styles.subtitle}>在正文中插入一个多维表格块，然后选中它进行配置。</div>
          </div>
        </div>
        <div className={styles.body}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前没有选中的多维表格"
          >
            {canEditDocument ? (
              <Button type="primary" icon={<Icon name="table" size={14} />} onClick={onInsertSpreadsheetBlock}>
                插入多维表格
              </Button>
            ) : null}
          </Empty>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <span className={styles.title}>多维表格配置</span>
            <div className={styles.subtitle}>拖拽字段到行 / 列 / 指标区域，配置会同步到正文块。</div>
          </div>
          <Space>
            <Button size="small" onClick={onRefreshSpreadsheet} icon={<Icon name="refresh" size={14} />}>
              刷新
            </Button>
            <Button size="small" onClick={onExportSpreadsheet} icon={<Icon name="download" size={14} />}>
              导出
            </Button>
          </Space>
        </div>

        <div className={styles.statusRow}>
          <Tag color={spreadsheet.mode === 'pivot' ? 'blue' : 'green'}>
            {spreadsheet.mode === 'pivot' ? '透视表模式' : '明细表模式'}
          </Tag>
          <Tag>{spreadsheet.config.rows.length} 行维度</Tag>
          <Tag>{spreadsheet.config.columns.length} 列维度</Tag>
          <Tag>{spreadsheet.config.values.length} 指标</Tag>
        </div>

        {error && <Alert type="warning" showIcon message={error} />}
        {loading && !error && <Alert type="info" showIcon message="正在同步多维表格数据..." />}
      </div>

      <div className={styles.body}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Text strong>基础信息</Text>
            <Text type="secondary">当前块 ID: {spreadsheet.blockId}</Text>
          </div>

          <div className={styles.summaryCard}>
            <label className={styles.label}>标题</label>
            <Input
              value={spreadsheet.title}
              onChange={(event) => patchBlock({ title: event.target.value })}
              disabled={!canEditDocument}
              placeholder="输入表格标题"
            />

            <div className={styles.inlineControls}>
              <div>
                <label className={styles.label}>模式</label>
                <Select
                  value={spreadsheet.mode}
                  disabled={!canEditDocument}
                  onChange={(value) => patchBlock({ mode: value })}
                  options={[
                    { value: 'pivot', label: '透视表' },
                    { value: 'table', label: '明细表' },
                  ]}
                />
              </div>

              <div>
                <label className={styles.label}>主指标</label>
                <Select
                  value={spreadsheet.activeMetric || undefined}
                  disabled={!canEditDocument || !spreadsheet.config.values.length}
                  allowClear
                  placeholder="选择展示指标"
                  onChange={(value) => patchBlock({ activeMetric: value ?? null })}
                  options={spreadsheet.config.values.map((field) => ({
                    value: field,
                    label: getFieldLabel(fieldCatalog, field),
                  }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Text strong>字段面板</Text>
            <Space size={8}>
              <Text type="secondary">拖拽字段到目标区域</Text>
              {canEditDocument ? (
                <Button size="small" type="primary" icon={<Icon name="table" size={14} />} onClick={openNewFieldModal}>
                  新增字段
                </Button>
              ) : null}
            </Space>
          </div>

          <div className={styles.fieldPalette}>
            {fieldCatalog.length ? fieldCatalog.map((field) => {
              const assigned = [
                spreadsheet.config.rows.includes(field.field),
                spreadsheet.config.columns.includes(field.field),
                spreadsheet.config.values.includes(field.field),
              ].some(Boolean)

              return (
                <button
                  key={field.field}
                  type="button"
                  draggable={canEditDocument}
                  className={[
                    styles.fieldChip,
                    assigned ? styles.fieldChipAssigned : '',
                  ].filter(Boolean).join(' ')}
                  onDragStart={() => {
                    setDragField(field.field)
                    setDragSource('palette')
                  }}
                  onDragEnd={() => {
                    setDragField(null)
                    setDragSource(null)
                  }}
                >
                  <span className={styles.fieldChipTitle}>
                    <Icon name="drag" size={12} />
                    {field.name}
                  </span>
                  <Tag>{assigned ? '已使用' : field.type === 'metric' ? '指标' : '维度'}</Tag>
                </button>
              )
            }) : (
              <Text type="secondary">暂无字段元数据</Text>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Text strong>拖拽布局</Text>
            <Text type="secondary">可拖拽字段到下面区域</Text>
          </div>

          {(
            [
              { key: 'rows' as const, label: '行' },
              { key: 'columns' as const, label: '列' },
              { key: 'values' as const, label: '指标' },
            ]
          ).map((group) => {
            const items = spreadsheet.config[group.key]
            return (
              <div
                key={group.key}
                className={styles.dropZone}
                onDragOver={(event) => {
                  if (!canEditDocument) return
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  handleDropGroup(group.key)
                }}
              >
                <div className={styles.dropZoneHeader}>
                  <Text strong>{group.label}</Text>
                  <Text type="secondary">{items.length} 项</Text>
                </div>

                <div className={styles.dropZoneBody}>
                  {items.length ? items.map((field) => (
                    <span
                      key={field}
                      className={styles.movableTag}
                      draggable={canEditDocument}
                      onDragStart={() => {
                        setDragField(field)
                        setDragSource(group.key)
                      }}
                      onDragEnd={() => {
                        setDragField(null)
                        setDragSource(null)
                      }}
                    >
                      <Icon name="drag" size={12} />
                      <span>{getFieldLabel(fieldCatalog, field)}</span>
                      {canEditDocument && (
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => handleRemoveField(field, group.key)}
                        >
                          <Icon name="close" size={12} />
                        </button>
                      )}
                    </span>
                  )) : (
                    <span className={styles.dropHint}>拖入字段到这里</span>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Text strong>筛选条件</Text>
            <Text type="secondary">仅对当前视图生效</Text>
          </div>

          <div className={styles.filterComposer}>
            <Select
              value={filterDraft.field || undefined}
              disabled={!canEditDocument}
              placeholder="选择字段"
              onChange={(value) => setFilterDraft((prev) => ({ ...prev, field: value }))}
              options={fieldCatalog.map((field) => ({ value: field.field, label: field.name }))}
            />
            <Select
              value={filterDraft.operator}
              disabled={!canEditDocument}
              onChange={(value) => setFilterDraft((prev) => ({ ...prev, operator: value }))}
              options={[
                { value: 'contains', label: '包含' },
                { value: 'equals', label: '等于' },
                { value: 'greater', label: '大于' },
                { value: 'less', label: '小于' },
              ]}
            />
            <Input
              value={filterDraft.value}
              disabled={!canEditDocument}
              placeholder="筛选值"
              onChange={(event) => setFilterDraft((prev) => ({ ...prev, value: event.target.value }))}
            />
            <Button type="primary" disabled={!canEditDocument || !filterDraft.field || !filterDraft.value.trim()} onClick={handleAddFilter}>
              添加
            </Button>
          </div>

          <div className={styles.filterList}>
            {spreadsheet.filters.length ? spreadsheet.filters.map((filter, index) => (
              <div key={`${filter.field}_${index}`} className={styles.filterItem}>
                <Space size={6} wrap>
                  <Tag>{getFieldLabel(fieldCatalog, filter.field)}</Tag>
                  <Tag>{filter.operator}</Tag>
                  <Text>{filter.value}</Text>
                </Space>
                {canEditDocument && (
                  <Button type="link" onClick={() => handleRemoveFilter(index)}>
                    删除
                  </Button>
                )}
              </div>
            )) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无筛选条件" />
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Text strong>排序</Text>
            <Text type="secondary">按某个字段排序当前视图</Text>
          </div>

          <div className={styles.inlineControls}>
            <Select
              value={spreadsheet.sort.field || undefined}
              disabled={!canEditDocument}
              allowClear
              placeholder="选择排序字段"
              onChange={(value) => patchBlock({ sort: { ...spreadsheet.sort, field: value ?? null } })}
              options={fieldCatalog.map((field) => ({ value: field.field, label: field.name }))}
            />
            <Select
              value={spreadsheet.sort.order}
              disabled={!canEditDocument}
              onChange={(value) => patchBlock({ sort: { ...spreadsheet.sort, order: value } })}
              options={[
                { value: 'desc', label: '降序' },
                { value: 'asc', label: '升序' },
              ]}
            />
          </div>
        </section>

        <Divider />

        <Space wrap>
          {canEditDocument ? (
            <Button type="primary" icon={<Icon name="table" size={14} />} onClick={onInsertSpreadsheetBlock}>
              新增多维表格
            </Button>
          ) : null}
          <Button icon={<Icon name="download" size={14} />} onClick={onExportSpreadsheet}>
            导出当前视图
          </Button>
        </Space>
      </div>

      <Modal
        title="新增字段"
        open={newFieldOpen}
        onCancel={() => setNewFieldOpen(false)}
        onOk={handleCreateField}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={fieldForm} layout="vertical" initialValues={{ fieldType: 'dimension' }}>
          <Form.Item
            name="fieldName"
            label="显示名"
            rules={[
              { required: true, message: '请输入字段显示名' },
              { whitespace: true, message: '字段显示名不能为空' },
            ]}
          >
            <Input placeholder="例如：部门 / 金额 / 负责人" />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label="字段类型"
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select
              options={[
                { value: 'dimension', label: '维度' },
                { value: 'metric', label: '指标' },
              ]}
            />
          </Form.Item>

          <Text type="secondary">
            字段 ID 会自动生成，创建后会立即出现在右侧字段面板里；如果是指标字段，也会同步进入明细表列和透视表指标池。
          </Text>
        </Form>
      </Modal>
    </div>
  )
}
