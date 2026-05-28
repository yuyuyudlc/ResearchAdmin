import { useMemo, useState } from 'react'
import { Tabs } from 'antd'
import type { SpreadsheetBlockState } from '../../../../services'
import type { Collaborator, CommentThread, PendingCommentSelection } from '../../hooks/commentThreads'
import DiscussionSidebar from '../DiscussionSidebar'
import { PivotTableSidebar } from '../PivotTableSidebar'
import styles from './style/index.module.css'

interface Props {
  threads: CommentThread[]
  activeThreadId: string
  collaborators: Collaborator[]
  providerStatus: 'connecting' | 'connected' | 'disconnected'
  canEditDocument: boolean
  pendingSelection: PendingCommentSelection | null
  replying: boolean
  updatingThread: boolean
  onSelectThread: (threadId: string) => void
  onReply: (threadId: string, content: string, parentId: string | null) => Promise<void>
  onToggleThreadStatus: (threadId: string, status: 'open' | 'resolved') => Promise<void>
  onRelocateThread: (threadId: string) => Promise<void>
  spreadsheet: SpreadsheetBlockState | null
  spreadsheetLoading: boolean
  spreadsheetError: string | null
  onInsertSpreadsheetBlock: () => void
  onPatchSpreadsheetBlock: (patch: Partial<SpreadsheetBlockState>) => Promise<void> | void
  onRefreshSpreadsheet: () => void
  onExportSpreadsheet: () => void
}

export default function DocumentSidebar({
  threads,
  activeThreadId,
  collaborators,
  providerStatus,
  canEditDocument,
  pendingSelection,
  replying,
  updatingThread,
  onSelectThread,
  onReply,
  onToggleThreadStatus,
  onRelocateThread,
  spreadsheet,
  spreadsheetLoading,
  spreadsheetError,
  onInsertSpreadsheetBlock,
  onPatchSpreadsheetBlock,
  onRefreshSpreadsheet,
  onExportSpreadsheet,
}: Props) {
  const [tab, setTab] = useState<'discussion' | 'spreadsheet'>('discussion')

  const items = useMemo(() => [
    {
      key: 'discussion',
      label: '协同讨论',
      children: (
        <DiscussionSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          collaborators={collaborators}
          providerStatus={providerStatus}
          canEditDocument={canEditDocument}
          pendingSelection={pendingSelection}
          replying={replying}
          updatingThread={updatingThread}
          onSelectThread={onSelectThread}
          onReply={onReply}
          onToggleThreadStatus={onToggleThreadStatus}
          onRelocateThread={onRelocateThread}
        />
      ),
    },
    {
      key: 'spreadsheet',
      label: '多维表格',
      children: (
        <PivotTableSidebar
          spreadsheet={spreadsheet}
          loading={spreadsheetLoading}
          error={spreadsheetError}
          canEditDocument={canEditDocument}
          onInsertSpreadsheetBlock={onInsertSpreadsheetBlock}
          onPatchSpreadsheetBlock={onPatchSpreadsheetBlock}
          onRefreshSpreadsheet={onRefreshSpreadsheet}
          onExportSpreadsheet={onExportSpreadsheet}
        />
      ),
    },
  ], [
    activeThreadId,
    canEditDocument,
    collaborators,
    onExportSpreadsheet,
    onInsertSpreadsheetBlock,
    onPatchSpreadsheetBlock,
    onRefreshSpreadsheet,
    onReply,
    onRelocateThread,
    onSelectThread,
    onToggleThreadStatus,
    pendingSelection,
    providerStatus,
    replying,
    spreadsheet,
    spreadsheetError,
    spreadsheetLoading,
    threads,
    updatingThread,
  ])

  return (
    <div className={styles.sidebar}>
      <Tabs
        className={styles.tabs}
        activeKey={tab}
        onChange={(key) => setTab(key as 'discussion' | 'spreadsheet')}
        items={items}
      />
    </div>
  )
}
