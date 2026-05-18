import { useState, type DragEvent, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Dropdown, Empty, Spin, Tooltip } from 'antd'
import { isDescendant, type TreeNode } from '../../contexts/PrivateSpaceContext'
import Icon from '../Icon'
import styles from './style.module.css'

type DropMode = 'sibling-before' | 'inside'

interface DropTarget {
  id: string
  mode: DropMode
}

export interface DocumentTreeProps {
  tree: TreeNode[]
  loading?: boolean
  onCreate: (parentId: string | null) => void
  onMove: (sourceId: string, parentId: string | null, sortOrder: number) => Promise<void> | void
  onRemove: (documentId: string) => Promise<void> | void
  /** 是否允许在根空白处接收拖拽（默认 true） */
  rootDroppable?: boolean
}

export default function DocumentTree({
  tree,
  loading,
  onCreate,
  onMove,
  onRemove,
  rootDroppable = true,
}: DocumentTreeProps) {
  const navigate = useNavigate()
  const { documentId: activeId } = useParams<{ documentId: string }>()
  const { message, modal } = App.useApp()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const isExpanded = (id: string) => expanded.has(id)
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, node: TreeNode) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
    setDragId(node.id)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, node: TreeNode) => {
    if (!dragId || dragId === node.id) return
    const sourceMeta = findNode(tree, dragId)
    if (sourceMeta && isDescendant(sourceMeta, node.id)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const mode: DropMode = x < rect.width / 2 ? 'sibling-before' : 'inside'
    if (
      !dropTarget ||
      dropTarget.id !== node.id ||
      dropTarget.mode !== mode
    ) {
      setDropTarget({ id: node.id, mode })
    }
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDropTarget(null)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>, node: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('text/plain') || dragId
    setDragId(null)
    setDropTarget(null)
    if (!sourceId || sourceId === node.id) return
    const sourceMeta = findNode(tree, sourceId)
    if (!sourceMeta) return
    if (isDescendant(sourceMeta, node.id)) {
      message.warning('不能把节点移动到自身或其子孙之中')
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const mode: DropMode = x < rect.width / 2 ? 'sibling-before' : 'inside'

    try {
      if (mode === 'inside') {
        await onMove(sourceId, node.id, 0)
        setExpanded((prev) => new Set(prev).add(node.id))
        message.success(`已移动到「${node.title}」内`)
      } else {
        const parentId = findParentId(tree, node.id) ?? null
        const targetSort = Math.max(1, (node.sortOrder || 1) - 1)
        await onMove(sourceId, parentId, targetSort)
        message.success('已移动为同级节点')
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移动失败')
    }
  }

  const handleRootDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (!rootDroppable) return
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain') || dragId
    setDragId(null)
    setDropTarget(null)
    if (!sourceId) return
    try {
      await onMove(sourceId, null, 0)
      message.success('已移动到根目录')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移动失败')
    }
  }

  const confirmDelete = (node: TreeNode) => {
    modal.confirm({
      title: '删除文档',
      content: `确定删除「${node.title || '未命名'}」吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await onRemove(node.id)
          message.success('已删除')
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  const renderNode = (node: TreeNode) => {
    const isFolder = node.docType === 'folder' || node.children.length > 0
    const opened = isExpanded(node.id)
    const active = activeId === node.id
    const isDropInside = dropTarget?.id === node.id && dropTarget.mode === 'inside'
    const isDropBefore = dropTarget?.id === node.id && dropTarget.mode === 'sibling-before'

    const onClickRow = () => {
      if (isFolder && node.docType === 'folder') {
        toggleExpand(node.id)
      } else {
        navigate(`/documents/${node.id}`)
      }
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    return (
      <div key={node.id} className={styles.nodeBlock}>
        {isDropBefore && <div className={styles.dropIndicatorLine} />}
        <div
          className={[
            styles.row,
            active ? styles.rowActive : '',
            isDropInside ? styles.rowDropInside : '',
            dragId === node.id ? styles.rowDragging : '',
          ].join(' ')}
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragEnd={handleDragEnd}
          onDrop={(e) => handleDrop(e, node)}
          onClick={onClickRow}
          onContextMenu={onContextMenu}
        >
          <span
            className={styles.toggle}
            onClick={(e) => {
              e.stopPropagation()
              if (node.children.length > 0) toggleExpand(node.id)
            }}
          >
            {node.children.length > 0 ? (
              <Icon name={opened ? 'caret-down' : 'caret-right'} size={14} />
            ) : null}
          </span>
          <span className={styles.icon}>
            <Icon
              name={isFolder ? (opened ? 'folder-open' : 'folder') : 'file'}
              size={16}
            />
          </span>
          <span className={styles.title} title={node.title}>
            {node.title || '未命名'}
          </span>
          <span className={styles.actions} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="新建子文档">
              <Button
                type="text"
                size="small"
                icon={<Icon name="plus" size={14} />}
                onClick={() => onCreate(node.id)}
              />
            </Tooltip>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'open', label: '打开', onClick: () => navigate(`/documents/${node.id}`) },
                  { key: 'add', label: '在此下新建', onClick: () => onCreate(node.id) },
                  { type: 'divider' },
                  { key: 'delete', danger: true, label: '删除', onClick: () => confirmDelete(node) },
                ],
              }}
            >
              <Button type="text" size="small" icon={<Icon name="more" size={14} />} />
            </Dropdown>
          </span>
        </div>
        {opened && node.children.length > 0 && (
          <div className={styles.children}>
            {node.children.map((c) => renderNode(c))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.tree}>
      <Spin spinning={!!loading}>
        {tree.length === 0 && !loading ? (
          <div className={styles.empty}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文档" />
            <Button block onClick={() => onCreate(null)}>+ 新建文档</Button>
          </div>
        ) : (
          <div
            className={styles.rootDrop}
            onDragOver={(e) => {
              if (rootDroppable && dragId) e.preventDefault()
            }}
            onDrop={handleRootDrop}
          >
            {tree.map((node) => renderNode(node))}
          </div>
        )}
      </Spin>
    </div>
  )
}

function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

/**
 * 查找节点在树中的父级 ID。
 * 节点在根 → null；找不到 → undefined。
 */
function findParentId(
  nodes: TreeNode[],
  id: string,
  parentId: string | null = null,
): string | null | undefined {
  for (const node of nodes) {
    if (node.id === id) return parentId
    const r = findParentId(node.children, id, node.id)
    if (r !== undefined) return r
  }
  return undefined
}