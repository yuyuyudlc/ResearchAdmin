import { useEffect, useMemo, useState, startTransition, type ComponentType } from 'react'
import { App, Button, Empty, Input, Result, Skeleton, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SheetComponent } from '@antv/s2-react'
import * as XLSX from 'xlsx'
import Icon from '../../../../components/Icon'
import type {
  SpreadsheetBlockState,
  SpreadsheetConfig,
  SpreadsheetFilter,
  SpreadsheetRecord,
  SpreadsheetSort,
} from '../../../../services'
import styles from './style/index.module.css'

const { Text } = Typography
const S2SheetComponent = SheetComponent as unknown as ComponentType<any>

interface VisibleRow<T extends SpreadsheetRecord = SpreadsheetRecord> {
  originalIndex: number
  record: T
}

interface IndexedRow {
  originalIndex: number
  record: SpreadsheetRecord
}

interface BroadcastSpreadsheetDetail {
  blockId: string
  state: SpreadsheetBlockState
  records: SpreadsheetRecord[]
}

export interface SpreadsheetViewProps {
  state: SpreadsheetBlockState
  records: SpreadsheetRecord[]
  loading: boolean
  error: string | null
  canEdit: boolean
  onRetry: () => void
  onCellCommit: (rowIndex: number, field: string, value: string | number | null) => Promise<void>
}

type TableEditState = Record<string, string>
type TableErrorState = Record<string, string | null>

function getFieldLabel(config: SpreadsheetConfig, field: string): string {
  return config.meta.find((item) => item.field === field)?.name || field
}

function getFieldType(config: SpreadsheetConfig, field: string): 'dimension' | 'metric' {
  const meta = config.meta.find((item) => item.field === field)
  if (meta?.type) {
    return meta.type
  }
  return config.values.includes(field) ? 'metric' : 'dimension'
}

function stringifyValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function applyFilters(records: SpreadsheetRecord[], filters: SpreadsheetFilter[]): SpreadsheetRecord[] {
  if (!filters.length) {
    return records
  }

  return records.filter((record) => {
    return filters.every((filter) => {
      const left = stringifyValue(record[filter.field]).trim()
      const right = filter.value.trim()

      switch (filter.operator) {
        case 'equals':
          return left === right
        case 'greater':
          return Number(left) > Number(right)
        case 'less':
          return Number(left) < Number(right)
        case 'contains':
        default:
          return left.toLowerCase().includes(right.toLowerCase())
      }
    })
  })
}

function applyFiltersIndexed(rows: IndexedRow[], filters: SpreadsheetFilter[]): IndexedRow[] {
  if (!filters.length) {
    return rows
  }

  return rows.filter((row) => {
    return filters.every((filter) => {
      const left = stringifyValue(row.record[filter.field]).trim()
      const right = filter.value.trim()

      switch (filter.operator) {
        case 'equals':
          return left === right
        case 'greater':
          return Number(left) > Number(right)
        case 'less':
          return Number(left) < Number(right)
        case 'contains':
        default:
          return left.toLowerCase().includes(right.toLowerCase())
      }
    })
  })
}

function applySort(records: SpreadsheetRecord[], sort: SpreadsheetSort): SpreadsheetRecord[] {
  if (!sort.field) {
    return records
  }

  const direction = sort.order === 'asc' ? 1 : -1
  return [...records].sort((left, right) => {
    const leftValue = stringifyValue(left[sort.field!])
    const rightValue = stringifyValue(right[sort.field!])
    const leftNumber = Number(leftValue)
    const rightNumber = Number(rightValue)

    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return (leftNumber - rightNumber) * direction
    }

    return leftValue.localeCompare(rightValue, 'zh-Hans-CN') * direction
  })
}

function applySortIndexed(rows: IndexedRow[], sort: SpreadsheetSort): IndexedRow[] {
  if (!sort.field) {
    return rows
  }

  const direction = sort.order === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const leftValue = stringifyValue(left.record[sort.field!])
    const rightValue = stringifyValue(right.record[sort.field!])
    const leftNumber = Number(leftValue)
    const rightNumber = Number(rightValue)

    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return (leftNumber - rightNumber) * direction
    }

    return leftValue.localeCompare(rightValue, 'zh-Hans-CN') * direction
  })
}

function buildPivotMatrix(state: SpreadsheetBlockState, records: SpreadsheetRecord[]) {
  const rowFields = state.config.rows
  const columnFields = state.config.columns
  const metricFields = state.activeMetric && state.config.values.includes(state.activeMetric)
    ? [state.activeMetric]
    : state.config.values
  const valueFields = metricFields.length > 0 ? metricFields : state.config.values
  const filteredRecords = applySort(applyFilters(records, state.filters), state.sort)

  const rowKeyMap = new Map<string, SpreadsheetRecord[]>()
  const columnKeySet = new Set<string>()

  filteredRecords.forEach((record) => {
    const rowKey = rowFields.map((field) => stringifyValue(record[field])).join(' / ') || '总计'
    const columnKey = columnFields.map((field) => stringifyValue(record[field])).join(' / ') || '总计'
    columnKeySet.add(columnKey)
    const rows = rowKeyMap.get(rowKey) || []
    rows.push(record)
    rowKeyMap.set(rowKey, rows)
  })

  const columnKeys = Array.from(columnKeySet.values())

  const columns = [...rowFields, ...columnKeys.flatMap((columnKey) => {
    return valueFields.map((field) => `${columnKey} · ${getFieldLabel(state.config, field)}`)
  })]

  const rows = Array.from(rowKeyMap.entries()).map(([rowKey, rowRecords]) => {
    const rowRecord: Record<string, string | number> = {}
    const rowValueSample = rowRecords[0] || {}

    rowFields.forEach((field, index) => {
      const value = rowKey.split(' / ')[index] || stringifyValue(rowValueSample[field])
      rowRecord[field] = value
    })

    columnKeys.forEach((columnKey) => {
      const bucket = rowRecords.filter((record) => {
        const currentColumnKey = columnFields.map((field) => stringifyValue(record[field])).join(' / ') || '总计'
        return currentColumnKey === columnKey
      })

      valueFields.forEach((field) => {
        const label = `${columnKey} · ${getFieldLabel(state.config, field)}`
        const total = bucket.reduce((sum, record) => {
          const numericValue = Number(record[field] ?? 0)
          return Number.isFinite(numericValue) ? sum + numericValue : sum
        }, 0)
        rowRecord[label] = total
      })
    })

    return rowRecord
  })

  return {
    columns,
    rows,
    total: rows.length,
    filteredRecords,
    visibleMetrics: valueFields,
  }
}

function buildTableColumns(config: SpreadsheetConfig): ColumnsType<VisibleRow> {
  const groupOrder = [...config.rows, ...config.columns, ...config.values]
  const metaOrder = config.meta.map((item) => item.field)
  const fields = Array.from(new Set([...groupOrder, ...metaOrder]))

  return fields.map((field) => ({
    title: getFieldLabel(config, field),
    dataIndex: field,
    key: field,
    width: Math.max(120, getFieldLabel(config, field).length * 12),
    render: (_value: unknown, row: VisibleRow) => stringifyValue(row.record[field]),
  }))
}

function isNumericCellField(state: SpreadsheetBlockState, field: string): boolean {
  return getFieldType(state.config, field) === 'metric'
}

function createExportWorkbook(state: SpreadsheetBlockState, records: SpreadsheetRecord[]) {
  const normalizedRecords = applySort(applyFilters(records, state.filters), state.sort)
  const workbook = XLSX.utils.book_new()

  if (state.mode === 'pivot') {
    const matrix = buildPivotMatrix(state, normalizedRecords)
    const aoa = [matrix.columns, ...matrix.rows.map((row) => matrix.columns.map((column) => row[column] ?? ''))]
    const sheet = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(workbook, sheet, 'PivotView')
    return workbook
  }

  const columns = Array.from(new Set([
    ...state.config.rows,
    ...state.config.columns,
    ...state.config.values,
    ...state.config.meta.map((item) => item.field),
    ...normalizedRecords.flatMap((record) => Object.keys(record)),
  ]))
  const headers = columns.map((field) => getFieldLabel(state.config, field))
  const rows = normalizedRecords.map((record) => columns.map((field) => record[field] ?? ''))
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  XLSX.utils.book_append_sheet(workbook, sheet, 'TableView')
  return workbook
}

export function downloadSpreadsheetWorkbook(state: SpreadsheetBlockState, records: SpreadsheetRecord[]) {
  const workbook = createExportWorkbook(state, records)
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  const safeTitle = state.title.trim() || 'spreadsheet'
  link.download = `${safeTitle.replace(/\s+/g, '_')}_${state.mode}.xlsx`
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function SpreadsheetView({
  state,
  records,
  loading,
  error,
  canEdit,
  onRetry,
  onCellCommit,
}: SpreadsheetViewProps) {
  const { message } = App.useApp()
  const [editDrafts, setEditDrafts] = useState<TableEditState>({})
  const [editErrors, setEditErrors] = useState<TableErrorState>({})
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({})

  useEffect(() => {
    startTransition(() => {
      setEditDrafts({})
      setEditErrors({})
      setSavingCells({})
    })
  }, [state.blockId, state.mode])

  const normalizedRecords = useMemo(() => applySort(applyFilters(records, state.filters), state.sort), [records, state.filters, state.sort])
  const indexedRecords = useMemo(() => records.map((record, originalIndex) => ({ originalIndex, record })), [records])
  const filteredIndexedRows = useMemo(() => applyFiltersIndexed(indexedRecords, state.filters), [indexedRecords, state.filters])
  const visibleRows = useMemo(() => applySortIndexed(filteredIndexedRows, state.sort), [filteredIndexedRows, state.sort])

  const pivotMatrix = useMemo(() => buildPivotMatrix(state, normalizedRecords), [state, normalizedRecords])

  const tableColumns = useMemo(() => buildTableColumns(state.config), [state.config])

  const metricFields = useMemo(() => new Set(state.config.values), [state.config.values])

  const broadcastSpreadsheetState = (nextRecords: SpreadsheetRecord[]) => {
    if (typeof window === 'undefined') {
      return
    }

    window.dispatchEvent(new CustomEvent<BroadcastSpreadsheetDetail>('research-admin-spreadsheet-updated', {
      detail: {
        blockId: state.blockId,
        state,
        records: nextRecords,
      },
    }))
  }

  const handleCellBlur = async (visibleRowIndex: number, sourceRowIndex: number, field: string, value: string) => {
    const visibleRow = visibleRows[visibleRowIndex]
    if (!visibleRow) {
      return
    }

    const currentValue = stringifyValue(visibleRow.record[field])
    const trimmed = value.trim()
    const cellKey = `${sourceRowIndex}:${field}`

    if (trimmed === currentValue) {
      setEditErrors((prev) => ({ ...prev, [cellKey]: null }))
      return
    }

    if (isNumericCellField(state, field) && trimmed && Number.isNaN(Number(trimmed))) {
      setEditErrors((prev) => ({ ...prev, [cellKey]: '请输入数字' }))
      message.error('销售额、利润等指标列必须输入数字')
      return
    }

    setSavingCells((prev) => ({ ...prev, [cellKey]: true }))
    try {
      const nextValue = isNumericCellField(state, field) && trimmed !== '' ? Number(trimmed) : trimmed
      await onCellCommit(sourceRowIndex, field, nextValue)
      setEditErrors((prev) => ({ ...prev, [cellKey]: null }))
      setEditDrafts((prev) => {
        const next = { ...prev }
        delete next[cellKey]
        return next
      })
      const nextRecords = normalizedRecords.map((record, index) => {
        if (index !== visibleRowIndex) {
          return record
        }
        return {
          ...record,
          [field]: nextValue,
        }
      })
      broadcastSpreadsheetState(nextRecords)
    } catch (err) {
      setEditErrors((prev) => ({ ...prev, [cellKey]: err instanceof Error ? err.message : '保存失败' }))
      message.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }))
    }
  }

  if (loading) {
    return <Skeleton active paragraph={{ rows: 6 }} />
  }

  if (error) {
    return (
      <Result
        status="error"
        title="多维表格加载失败"
        subTitle={error}
        extra={(
          <Button type="primary" onClick={onRetry}>
            重试
          </Button>
        )}
      />
    )
  }

  if (state.mode === 'pivot') {
    if (!normalizedRecords.length) {
      return (
        <Empty
          className={styles.empty}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无数据"
        >
          <Text type="secondary">当前视图没有记录，请使用卡片头部的“新增记录”按钮创建第一条数据，或者检查筛选条件。</Text>
        </Empty>
      )
    }

    return (
      <div className={styles.pivotShell}>
        <div className={styles.pivotSummary}>
          <Space wrap size={8}>
            <Tag color="blue">透视表模式</Tag>
            <Tag>{pivotMatrix.total} 行</Tag>
            <Tag>{pivotMatrix.visibleMetrics.length} 个指标</Tag>
            <Text type="secondary">支持筛选、排序与导出当前聚合视图</Text>
          </Space>
        </div>
        <div className={styles.sheetWrapper}>
          <S2SheetComponent
            sheetType="pivot"
            dataCfg={{
              fields: {
                rows: state.config.rows,
                columns: state.config.columns,
                values: pivotMatrix.visibleMetrics,
                valueInCols: true,
              },
              meta: state.config.meta.map((item) => ({ field: item.field, name: item.name })),
              data: normalizedRecords,
            }}
            options={{
              hierarchyType: 'grid',
              showSeriesNumber: false,
              totals: {
                row: {
                  showGrandTotals: true,
                  calcGrandTotals: { aggregation: 'SUM' },
                },
                col: {
                  showGrandTotals: true,
                  calcGrandTotals: { aggregation: 'SUM' },
                },
              },
            }}
            adaptive
          />
        </div>
      </div>
    )
  }

  const mergedRows = visibleRows.map((row, visibleIndex) => ({
    ...row.record,
    __rowIndex: row.originalIndex,
    __visibleIndex: visibleIndex,
  }))

  const renderEditableCell = (
    row: VisibleRow['record'] & { __rowIndex: number; __visibleIndex: number },
    field: string,
  ) => {
    const cellKey = `${row.__rowIndex}:${field}`
    const currentValue = stringifyValue(row[field])
    const draftValue = editDrafts[cellKey] ?? currentValue
    const saving = !!savingCells[cellKey]
    const errorText = editErrors[cellKey]
    const numeric = metricFields.has(field)

    return (
      <div className={styles.editCell}>
        <Input
          value={draftValue}
          status={errorText ? 'error' : undefined}
          inputMode={numeric ? 'decimal' : 'text'}
          onChange={(event) => {
            const nextValue = event.target.value
            setEditDrafts((prev) => ({ ...prev, [cellKey]: nextValue }))
            setEditErrors((prev) => ({ ...prev, [cellKey]: null }))
          }}
          onBlur={(event) => {
            void handleCellBlur(row.__visibleIndex, row.__rowIndex, field, event.target.value)
          }}
          placeholder={numeric ? '请输入数字' : '请输入内容'}
          variant="borderless"
          className={styles.cellInput}
        />
        {saving && <span className={styles.cellSaving}><Icon name="refresh" size={12} /></span>}
        {errorText && <span className={styles.cellError}>{errorText}</span>}
      </div>
    )
  }

  const columns: ColumnsType<any> = [
    {
      title: '#',
      dataIndex: '__rowIndex',
      key: '__rowIndex',
      width: 72,
      fixed: 'left',
      render: (_value: unknown, row: VisibleRow['record'] & { __rowIndex?: number }) => (row.__rowIndex ?? 0) + 1,
    },
    ...tableColumns.map((column) => ({
      ...column,
      render: (_value: unknown, row: VisibleRow['record'] & { __rowIndex?: number; __visibleIndex?: number }) => {
        if (!canEdit) {
          return stringifyValue(row[String(column.key)])
        }
        return renderEditableCell(
          {
            ...row,
            __rowIndex: row.__rowIndex ?? 0,
            __visibleIndex: row.__visibleIndex ?? 0,
          },
          String(column.key),
        )
      },
    })),
  ]
  const tableColumnsWithEmptyState = columns.length ? columns : [
    {
      title: '#',
      dataIndex: '__rowIndex',
      key: '__rowIndex',
      width: 72,
      fixed: 'left' as const,
      render: (_value: unknown, row: VisibleRow['record'] & { __rowIndex?: number }) => (row.__rowIndex ?? 0) + 1,
    },
  ]

  return (
    <div className={styles.tableShell}>
      <div className={styles.tableSummary}>
        <Space wrap size={8}>
          <Tag color="blue">明细表模式</Tag>
          <Tag>{visibleRows.length} 条记录</Tag>
          <Text type="secondary">单元格编辑仅在失焦校验通过后写回后端</Text>
        </Space>
      </div>
      <Table
        className={styles.table}
        columns={tableColumnsWithEmptyState}
        dataSource={mergedRows as any[]}
        rowKey={(row) => String((row as { __rowIndex?: number }).__rowIndex ?? 0)}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 'max-content', y: 620 }}
        size="small"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无数据"
            >
              <Text type="secondary">明细表已经显示字段列了，请使用卡片头部的“新增记录”按钮补充数据。</Text>
            </Empty>
          ),
        }}
      />
    </div>
  )
}