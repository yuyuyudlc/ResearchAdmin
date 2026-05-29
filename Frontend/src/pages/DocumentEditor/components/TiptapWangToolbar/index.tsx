import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { Button, Dropdown, Input, Modal, Space, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import Icon from '../../../../components/Icon'
import type { IconName } from '../../../../components/Icon'
import type { Level } from '@tiptap/extension-heading'
import styles from './style/index.module.css'

interface Props {
  editor: Editor | null
  disabled?: boolean
}

const HEADING_ACTIONS: { level: Level | 0; label: string; icon: IconName }[] = [
  { level: 0, label: '正文', icon: 'paragraph' },
  { level: 1, label: '标题 1', icon: 'heading' },
  { level: 2, label: '标题 2', icon: 'heading' },
  { level: 3, label: '标题 3', icon: 'heading' },
]

const LIST_ACTIONS: { key: string; label: string; icon: IconName }[] = [
  { key: 'bulletList', label: '无序列表', icon: 'list-ul' },
  { key: 'orderedList', label: '有序列表', icon: 'list-ol' },
  { key: 'taskList', label: '任务列表', icon: 'task' },
]

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef',
  '#f5222d', '#fa541c', '#fa8c16', '#fadb14', '#52c41a', '#13c2c2', '#1677ff', '#722ed1',
]

const HIGHLIGHT_COLORS = [
  '#fef08a', '#fed7aa', '#fecaca', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#e2e8f0',
]

const TABLE_INSERT_ACTIONS: { rows: number; cols: number; label: string }[] = [
  { rows: 3, cols: 3, label: '3×3 表格' },
  { rows: 4, cols: 4, label: '4×4 表格' },
  { rows: 5, cols: 5, label: '5×5 表格' },
]

const DIVIDER_CLASS = styles.divider

interface ToolbarBtnProps {
  icon: IconName
  onClick: () => void
  active?: boolean
  tip: string
  disabled?: boolean
}

function ToolbarBtn({ icon, onClick, active, tip, disabled }: ToolbarBtnProps) {
  return (
    <Tooltip title={tip} placement="bottom">
      <Button
        type="text"
        size="small"
        className={`${styles.btn} ${active ? styles.active : ''}`}
        disabled={disabled}
        onClick={onClick}
        aria-label={tip}
      >
        <Icon name={icon} size={16} />
      </Button>
    </Tooltip>
  )
}

interface DropdownToolbarBtnProps {
  icon?: IconName
  label?: string
  items: MenuProps['items']
  tip: string
  disabled?: boolean
}

function DropdownToolbarBtn({ icon, label, items, tip, disabled }: DropdownToolbarBtnProps) {
  return (
    <Dropdown menu={{ items }} trigger={['click']} disabled={disabled}>
      <Button
        type="text"
        size="small"
        className={label ? styles.headingBtn : styles.btn}
        disabled={disabled}
        aria-label={tip}
      >
        {icon && <Icon name={icon} size={16} />}
        {label && <span className={styles.headingLabel}>{label}</span>}
        <Icon name="caret-down" size={10} className={styles.headingCaret} />
      </Button>
    </Dropdown>
  )
}

function Divider() {
  return <span className={DIVIDER_CLASS} />
}

export default function TiptapToolbar({ editor, disabled }: Props) {
  const isDisabled = !editor || !!disabled
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor])
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor])
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor])
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor])
  const toggleCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor])
  const toggleSuperscript = useCallback(() => editor?.chain().focus().toggleSuperscript().run(), [editor])
  const toggleSubscript = useCallback(() => editor?.chain().focus().toggleSubscript().run(), [editor])
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor])
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor])
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor])
  const toggleTaskList = useCallback(() => editor?.chain().focus().toggleTaskList().run(), [editor])
  const indent = useCallback(() => editor?.chain().focus().indent().run(), [editor])
  const outdent = useCallback(() => editor?.chain().focus().outdent().run(), [editor])
  const setHR = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor])
  const undo = useCallback(() => editor?.chain().focus().undo().run(), [editor])
  const redo = useCallback(() => editor?.chain().focus().redo().run(), [editor])
  const alignLeft = useCallback(() => editor?.chain().focus().setTextAlign('left').run(), [editor])
  const alignCenter = useCallback(() => editor?.chain().focus().setTextAlign('center').run(), [editor])
  const alignRight = useCallback(() => editor?.chain().focus().setTextAlign('right').run(), [editor])
  const alignJustify = useCallback(() => editor?.chain().focus().setTextAlign('justify').run(), [editor])

  const unsetHighlight = useCallback(() => editor?.chain().focus().unsetHighlight().run(), [editor])
  const unsetTextColor = useCallback(() => editor?.chain().focus().unsetColor().run(), [editor])

  const setHeading = useCallback((level: Level | 0) => {
    if (level === 0) {
      editor?.chain().focus().setParagraph().run()
    } else {
      editor?.chain().focus().toggleHeading({ level }).run()
    }
  }, [editor])

  const setTable = useCallback((rows: number, cols: number) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  }, [editor])

  const openLinkModal = useCallback(() => {
    if (!editor) return
    const prevUrl = editor.getAttributes('link').href || ''
    setLinkUrl(prevUrl)
    setLinkModalOpen(true)
  }, [editor])

  const handleSetLink = useCallback(() => {
    if (!editor) return
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setLinkModalOpen(false)
  }, [editor, linkUrl])

  const handleRemoveLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkModalOpen(false)
  }, [editor])

  const isActive = useCallback((name: string | Record<string, unknown>, attrs?: Record<string, unknown>) => {
    if (typeof name === 'string') return editor?.isActive(name, attrs) ?? false
    return editor?.isActive(name) ?? false
  }, [editor])

  const currentHeadingLabel = ((): string => {
    if (!editor) return '正文'
    if (editor.isActive('heading', { level: 1 })) return '标题 1'
    if (editor.isActive('heading', { level: 2 })) return '标题 2'
    if (editor.isActive('heading', { level: 3 })) return '标题 3'
    return '正文'
  })()

  const currentListLabel = ((): string => {
    if (!editor) return '列表'
    if (editor.isActive('bulletList')) return '无序列表'
    if (editor.isActive('orderedList')) return '有序列表'
    if (editor.isActive('taskList')) return '任务列表'
    return '列表'
  })()

  const headingMenuItems: MenuProps['items'] = HEADING_ACTIONS.map((item) => ({
    key: `${item.level}`,
    label: (
      <Space size={6}>
        <Icon name={item.icon} size={14} />
        <span>{item.label}</span>
      </Space>
    ),
    onClick: () => setHeading(item.level),
  }))

  const listMenuItems: MenuProps['items'] = LIST_ACTIONS.map((item) => {
    const active = isActive(item.key)
    return {
      key: item.key,
      label: (
        <Space size={6}>
          <Icon name={item.icon} size={14} />
          <span>{item.label}</span>
        </Space>
      ),
      className: active ? styles.dropdownActiveItem : undefined,
      onClick: () => {
        if (item.key === 'bulletList') toggleBulletList()
        else if (item.key === 'orderedList') toggleOrderedList()
        else if (item.key === 'taskList') toggleTaskList()
      },
    }
  })

  const textColorItems: MenuProps['items'] = [
    ...TEXT_COLORS.map((color) => ({
      key: `color-${color}`,
      label: (
        <span className={styles.colorPreset}>
          <span className={styles.colorSwatch} style={{ backgroundColor: color }} />
          <span className={styles.colorLabel}>{color}</span>
        </span>
      ),
      onClick: () => editor?.chain().focus().setColor(color).run(),
    })),
    { type: 'divider' as const },
    {
      key: 'unset-color',
      label: '清除文字颜色',
      onClick: unsetTextColor,
    },
  ]

  const highlightItems: MenuProps['items'] = [
    ...HIGHLIGHT_COLORS.map((color) => ({
      key: `hl-${color}`,
      label: (
        <span className={styles.colorPreset}>
          <span className={styles.colorSwatch} style={{ backgroundColor: color }} />
        </span>
      ),
      onClick: () => editor?.chain().focus().setHighlight({ color }).run(),
    })),
    { type: 'divider' as const },
    {
      key: 'unset-highlight',
      label: '清除高亮',
      onClick: unsetHighlight,
    },
  ]

  const tableMenuItems: MenuProps['items'] = TABLE_INSERT_ACTIONS.map((item) => ({
    key: `${item.rows}-${item.cols}`,
    label: item.label,
    onClick: () => setTable(item.rows, item.cols),
  }))

  return (
    <>
      <div className={styles.toolbar}>
        <Space size={2} wrap>
          <ToolbarBtn icon="undo" onClick={undo} tip="撤销" disabled={isDisabled} />
          <ToolbarBtn icon="redo" onClick={redo} tip="重做" disabled={isDisabled} />

          <Divider />

          <DropdownToolbarBtn label={currentHeadingLabel} items={headingMenuItems} tip="标题级别" disabled={isDisabled} />

          <Divider />

          <ToolbarBtn icon="bold" onClick={toggleBold} active={isActive('bold')} tip="加粗" disabled={isDisabled} />
          <ToolbarBtn icon="italic" onClick={toggleItalic} active={isActive('italic')} tip="斜体" disabled={isDisabled} />
          <ToolbarBtn icon="underline" onClick={toggleUnderline} active={isActive('underline')} tip="下划线" disabled={isDisabled} />
          <ToolbarBtn icon="strike" onClick={toggleStrike} active={isActive('strike')} tip="删除线" disabled={isDisabled} />
          <ToolbarBtn icon="code" onClick={toggleCode} active={isActive('code')} tip="行内代码" disabled={isDisabled} />
          <ToolbarBtn icon="superscript" onClick={toggleSuperscript} active={isActive('superscript')} tip="上标" disabled={isDisabled} />
          <ToolbarBtn icon="subscript" onClick={toggleSubscript} active={isActive('subscript')} tip="下标" disabled={isDisabled} />

          <Divider />

          <DropdownToolbarBtn icon="text-color" items={textColorItems} tip="文字颜色" disabled={isDisabled} />
          <DropdownToolbarBtn icon="highlight" items={highlightItems} tip="高亮背景" disabled={isDisabled} />

          <Divider />

          <ToolbarBtn
            icon="link"
            onClick={openLinkModal}
            active={isActive('link')}
            tip={isActive('link') ? '编辑链接' : '插入链接'}
            disabled={isDisabled}
          />

          <Divider />

          <ToolbarBtn icon="align-left" onClick={alignLeft} active={isActive({ textAlign: 'left' })} tip="左对齐" disabled={isDisabled} />
          <ToolbarBtn icon="align-center" onClick={alignCenter} active={isActive({ textAlign: 'center' })} tip="居中对齐" disabled={isDisabled} />
          <ToolbarBtn icon="align-right" onClick={alignRight} active={isActive({ textAlign: 'right' })} tip="右对齐" disabled={isDisabled} />
          <ToolbarBtn icon="align-justify" onClick={alignJustify} active={isActive({ textAlign: 'justify' })} tip="两端对齐" disabled={isDisabled} />

          <Divider />

          <DropdownToolbarBtn icon="list-ul" label={currentListLabel} items={listMenuItems} tip="列表类型" disabled={isDisabled} />
          <ToolbarBtn icon="indent" onClick={indent} tip="增加缩进" disabled={isDisabled} />
          <ToolbarBtn icon="outdent" onClick={outdent} tip="减少缩进" disabled={isDisabled} />

          <Divider />

          <ToolbarBtn icon="blockquote" onClick={toggleBlockquote} active={isActive('blockquote')} tip="引用" disabled={isDisabled} />

          <Divider />

          <DropdownToolbarBtn icon="table-insert" label="表格" items={tableMenuItems} tip="插入表格" disabled={isDisabled} />
          <ToolbarBtn icon="hr" onClick={setHR} tip="分隔线" disabled={isDisabled} />
        </Space>
      </div>

      <Modal
        title="插入链接"
        open={linkModalOpen}
        onOk={handleSetLink}
        onCancel={() => setLinkModalOpen(false)}
        okText={linkUrl ? '保存' : '移除链接'}
        cancelText="取消"
        footer={(_, { OkBtn, CancelBtn }) => (
          <Space>
            {isActive('link') && (
              <Button danger onClick={handleRemoveLink}>移除链接</Button>
            )}
            <CancelBtn />
            <OkBtn />
          </Space>
        )}
        destroyOnHidden
      >
        <div className={styles.linkModalBody}>
          <div className={styles.linkField}>
            <label className={styles.linkLabel}>链接地址</label>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onPressEnter={handleSetLink}
              autoFocus
            />
          </div>
          <div className={styles.linkField}>
            <label className={styles.linkLabel}>显示文本</label>
            <Input
              placeholder="在编辑器中选中文本后自动填充"
              value={editor?.state.selection.empty ? '' : editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') || ''}
              readOnly
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
