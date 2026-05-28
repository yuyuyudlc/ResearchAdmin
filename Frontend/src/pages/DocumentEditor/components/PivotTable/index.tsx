import { useCallback, useEffect, useMemo, useState, startTransition } from 'react'
import { App, Button, Result, Space, Tag, Typography } from 'antd'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useParams } from 'react-router-dom'
import Icon from '../../../../components/Icon'
import { spreadsheetService } from '../../../../services'
import type {
  SpreadsheetBlockState,
  SpreadsheetConfig,
  SpreadsheetRecord,
} from '../../../../services'
import { downloadSpreadsheetWorkbook, SpreadsheetView } from '../SpreadsheetView'
import styles from './style/index.module.css'

const { Text } = Typography
const SPREADSHEET_EVENT_NAME = 'research-admin-spreadsheet-updated'

export interface SpreadsheetNodeAttrs extends SpreadsheetBlockState {
  sheetId: string
}

function createFallbackConfig(): SpreadsheetConfig {
  return {
    rows: [],
    columns: [],
    values: [],
    meta: [],
  }
}

function createDefaultSpreadsheetState(): SpreadsheetNodeAttrs {
  const sheetId = `sheet_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  return {
    sheetId,
    blockId: sheetId,
    title: '多维表格',
    mode: 'pivot',
    config: createFallbackConfig(),
    filters: [],
    sort: { field: null, order: 'desc' },
    activeMetric: null,
  }
}

function patchSpreadsheetState(
  current: SpreadsheetNodeAttrs,
  next: Partial<SpreadsheetNodeAttrs>,
): SpreadsheetNodeAttrs {
  return {
    ...current,
    ...next,
    config: next.config ? { ...next.config } : current.config,
    filters: next.filters ? [...next.filters] : current.filters,
    sort: next.sort ? { ...next.sort } : current.sort,
  }
}

function hasConfig(state: SpreadsheetNodeAttrs): boolean {
  return Boolean(state.config.rows.length || state.config.columns.length || state.config.values.length || state.config.meta.length)
}

function getSpreadsheetSummary(state: SpreadsheetNodeAttrs): string {
  return `${state.config.rows.length} 行维度 · ${state.config.columns.length} 列维度 · ${state.config.values.length} 指标`
}

function broadcastSpreadsheetState(state: SpreadsheetNodeAttrs, records: SpreadsheetRecord[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(SPREADSHEET_EVENT_NAME, {
    detail: {
      blockId: state.blockId,
      state,
      records,
    },
  }))
}

export function SpreadsheetBlockView({
  editor,
  node,
  selected,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const { message } = App.useApp()
  const { documentId } = useParams<{ documentId: string }>()
  const attrs = node.attrs as SpreadsheetNodeAttrs
  const [records, setRecords] = useState<SpreadsheetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remoteEnabled, setRemoteEnabled] = useState(true)

  const sheetState = useMemo(() => attrs, [attrs])

  const syncAttrsFromServer = useCallback((next: Partial<SpreadsheetNodeAttrs>) => {
    const merged = patchSpreadsheetState(attrs, next)
    updateAttributes(merged)
  }, [attrs, updateAttributes])

  const loadBlock = useCallback(async () => {
    if (!documentId) {
      setError('未找到文档上下文，无法加载多维表格。')
      setLoading(false)
      return
    }

    if (!remoteEnabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await spreadsheetService.getBlock(documentId, attrs.blockId)
      startTransition(() => {
        setRecords(res.data.records || [])
      })

      broadcastSpreadsheetState({
        ...attrs,
        title: res.data.title || attrs.title,
        mode: res.data.mode || attrs.mode,
        config: res.data.config || attrs.config,
        filters: res.data.filters || attrs.filters,
        sort: res.data.sort || attrs.sort,
        activeMetric: res.data.activeMetric ?? attrs.activeMetric,
      }, res.data.records || [])

      const nextState: Partial<SpreadsheetNodeAttrs> = {
        title: res.data.title || attrs.title,
        mode: res.data.mode || attrs.mode,
        filters: res.data.filters || attrs.filters,
        sort: res.data.sort || attrs.sort,
        activeMetric: res.data.activeMetric ?? attrs.activeMetric,
        config: res.data.config || attrs.config,
      }

      if (!hasConfig(attrs) || res.data.config) {
        syncAttrsFromServer(nextState)
      }
    } catch (err) {
      const messageText = err instanceof Error ? err.message : '加载多维表格失败'
      if (messageText.includes('404')) {
        setRemoteEnabled(false)
        setError('当前后端尚未提供多维表格接口，已切换为本地编辑态。接口实现后可自动恢复远程加载。')
      } else {
        setError(messageText)
      }
    } finally {
      setLoading(false)
    }
  }, [attrs.activeMetric, attrs.blockId, attrs.config, attrs.filters, attrs.mode, attrs.sort, attrs.title, documentId, remoteEnabled, syncAttrsFromServer])

  useEffect(() => {
    void loadBlock()
  }, [loadBlock])

  const handleSelectNode = () => {
    try {
      const position = typeof getPos === 'function' ? getPos() : null
      if (typeof position === 'number') {
        editor.commands.setNodeSelection(position)
      }
    } catch {
      // ignore selection race in collaborative editing
    }
  }

  const handleRetry = () => {
    if (!remoteEnabled) {
      setError('当前后端尚未提供多维表格接口，无法重试远程加载。')
      return
    }
    void loadBlock()
  }

  const handleCommitCell = useCallback(async (rowIndex: number, field: string, value: string | number | null) => {
    if (!documentId) {
      throw new Error('未找到文档上下文')
    }

    if (!remoteEnabled) {
      throw new Error('当前后端尚未提供多维表格接口，暂不支持写回')
    }

    const res = await spreadsheetService.updateCell(documentId, attrs.blockId, {
      rowIndex,
      field,
      value,
    })

    startTransition(() => {
      setRecords(res.data.records || records)
    })

    broadcastSpreadsheetState(
      {
        ...attrs,
        title: attrs.title,
        mode: attrs.mode,
        config: attrs.config,
        filters: attrs.filters,
        sort: attrs.sort,
        activeMetric: attrs.activeMetric,
      },
      res.data.records || records,
    )
  }, [attrs.blockId, documentId, records])

  const handleAddRecord = useCallback(async () => {
    if (!documentId) {
      throw new Error('未找到文档上下文')
    }

    if (!remoteEnabled) {
      throw new Error('当前后端尚未提供多维表格接口，暂不支持新增记录')
    }

    const res = await spreadsheetService.createRecord(documentId, attrs.blockId)

    startTransition(() => {
      setRecords(res.data.records || [])
    })

    broadcastSpreadsheetState(
      {
        ...attrs,
        title: attrs.title,
        mode: attrs.mode,
        config: attrs.config,
        filters: attrs.filters,
        sort: attrs.sort,
        activeMetric: attrs.activeMetric,
      },
      res.data.records || [],
    )
  }, [attrs, documentId, remoteEnabled])

  const handleExport = () => {
    downloadSpreadsheetWorkbook(sheetState, records)
    message.success('已导出当前视图')
  }

  const canEdit = editor.isEditable

  return (
    <NodeViewWrapper
      className={[
        styles.wrapper,
        selected ? styles.wrapperSelected : '',
        canEdit ? styles.wrapperEditable : styles.wrapperReadonly,
      ].filter(Boolean).join(' ')}
      data-spreadsheet-block
      data-block-id={attrs.blockId}
      onClick={handleSelectNode}
    >
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.titleRow}>
            <Icon name="table" size={16} color="#171717" />
            <Text strong>{attrs.title || '多维表格'}</Text>
          </span>
          <Space size={8} wrap>
            <Tag color={attrs.mode === 'pivot' ? 'blue' : 'green'}>
              {attrs.mode === 'pivot' ? '透视表' : '明细表'}
            </Tag>
            <Tag>{getSpreadsheetSummary(attrs)}</Tag>
            {canEdit ? <Tag color="success">可编辑</Tag> : <Tag>只读</Tag>}
          </Space>
        </div>

        <Space size={8} wrap>
          {canEdit ? (
            <Button size="small" type="primary" icon={<Icon name="table" size={14} />} onClick={() => { void handleAddRecord() }}>
              新增记录
            </Button>
          ) : null}
          <Button size="small" icon={<Icon name="refresh" size={14} />} onClick={handleRetry}>
            刷新
          </Button>
          <Button size="small" icon={<Icon name="download" size={14} />} onClick={handleExport}>
            导出当前视图
          </Button>
        </Space>
      </div>

      {error ? (
        <Result
          status="error"
          title="多维表格加载失败"
          subTitle={error}
          extra={(
            <Button type="primary" onClick={handleRetry}>
              重试
            </Button>
          )}
        />
      ) : (
        <SpreadsheetView
          state={sheetState}
          records={records}
          loading={loading}
          error={null}
          canEdit={canEdit}
          onRetry={handleRetry}
          onCellCommit={handleCommitCell}
        />
      )}
    </NodeViewWrapper>
  )
}

export { createDefaultSpreadsheetState }
