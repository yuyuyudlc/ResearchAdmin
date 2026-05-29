import { useEffect, useState, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { Button, Space } from 'antd'
import Icon from '../../../../components/Icon'
import type { IconName } from '../../../../components/Icon'
import styles from './style/index.module.css'

interface Props {
  editor: Editor | null
  disabled?: boolean
}

interface TableAction {
  key: string
  label: string
  icon: IconName
  action: () => void
}

const TABLE_ACTIONS: TableAction[] = [
  { key: 'add-row-before', label: '向上插入行', icon: 'plus', action: () => {} },
  { key: 'add-row-after', label: '向下插入行', icon: 'plus', action: () => {} },
  { key: 'delete-row', label: '删除行', icon: 'close', action: () => {} },
  { key: 'add-col-before', label: '向左插入列', icon: 'plus', action: () => {} },
  { key: 'add-col-after', label: '向右插入列', icon: 'plus', action: () => {} },
  { key: 'delete-col', label: '删除列', icon: 'close', action: () => {} },
  { key: 'toggle-header-row', label: '切换表头行', icon: 'heading', action: () => {} },
  { key: 'toggle-header-col', label: '切换表头列', icon: 'heading', action: () => {} },
  { key: 'merge-cells', label: '合并单元格', icon: 'table', action: () => {} },
  { key: 'split-cell', label: '拆分单元格', icon: 'table', action: () => {} },
  { key: 'delete-table', label: '删除表格', icon: 'close', action: () => {} },
]

export default function TableBubbleMenu({ editor, disabled }: Props) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showAtTable = useCallback((tableEl: HTMLTableElement) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    const rect = tableEl.getBoundingClientRect()
    setPosition({
      top: rect.top - 48,
      left: rect.left + rect.width / 2,
    })
    setVisible(true)
  }, [])

  const hideLater = useCallback(() => {
    hideTimerRef.current = setTimeout(() => setVisible(false), 200)
  }, [])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const dom = editor.view.dom

    const bindTable = (table: HTMLTableElement) => {
      table.addEventListener('mouseenter', () => showAtTable(table))
      table.addEventListener('mouseleave', hideLater)
    }

    const unbindTable = (table: HTMLTableElement) => {
      table.removeEventListener('mouseenter', () => showAtTable(table))
      table.removeEventListener('mouseleave', hideLater)
    }

    const bindAll = () => {
      dom.querySelectorAll<HTMLTableElement>('table').forEach(bindTable)
    }

    bindAll()

    const observer = new MutationObserver(() => {
      dom.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
        if (!(table as unknown as { __bound?: boolean }).__bound) {
          ;(table as unknown as { __bound?: boolean }).__bound = true
          bindTable(table)
        }
      })
    })
    observer.observe(dom, { childList: true, subtree: true })

    editor.on('update', bindAll)

    return () => {
      observer.disconnect()
      editor.off('update', bindAll)
      dom.querySelectorAll<HTMLTableElement>('table').forEach(unbindTable)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [editor, showAtTable, hideLater])

  if (!visible || !editor) return null

  const actions: TableAction[] = TABLE_ACTIONS.map((item) => {
    switch (item.key) {
      case 'add-row-before': return { ...item, action: () => editor.chain().focus().addRowBefore().run() }
      case 'add-row-after': return { ...item, action: () => editor.chain().focus().addRowAfter().run() }
      case 'delete-row': return { ...item, action: () => editor.chain().focus().deleteRow().run() }
      case 'add-col-before': return { ...item, action: () => editor.chain().focus().addColumnBefore().run() }
      case 'add-col-after': return { ...item, action: () => editor.chain().focus().addColumnAfter().run() }
      case 'delete-col': return { ...item, action: () => editor.chain().focus().deleteColumn().run() }
      case 'toggle-header-row': return { ...item, action: () => editor.chain().focus().toggleHeaderRow().run() }
      case 'toggle-header-col': return { ...item, action: () => editor.chain().focus().toggleHeaderColumn().run() }
      case 'merge-cells': return { ...item, action: () => editor.chain().focus().mergeCells().run() }
      case 'split-cell': return { ...item, action: () => editor.chain().focus().splitCell().run() }
      case 'delete-table': return { ...item, action: () => editor.chain().focus().deleteTable().run() }
      default: return item
    }
  })

  return (
    <div
      className={styles.menu}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseEnter={() => {
        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null }
      }}
      onMouseLeave={hideLater}
    >
      <Space size={2} wrap>
        {actions.map((item) => (
          <Button
            key={item.key}
            type="text"
            size="small"
            className={styles.btn}
            disabled={disabled}
            onClick={item.action}
            title={item.label}
            aria-label={item.label}
          >
            <Icon name={item.icon} size={14} />
            <span className={styles.label}>{item.label}</span>
          </Button>
        ))}
      </Space>
    </div>
  )
}
