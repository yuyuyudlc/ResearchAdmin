import { useEffect, useRef } from 'react'
import Icon from '../../../../components/Icon'
import styles from './style/index.module.css'
import type { MenuItem } from './contextMenuItems'

export interface ContextMenuPosition {
  x: number
  y: number
}

interface Props {
  open: boolean
  position: ContextMenuPosition
  items: MenuItem[]
  onClose: () => void
}

export default function EditorContextMenu({ open, position, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const separated: (MenuItem | 'divider')[] = []
  items.forEach((item) => {
    if (separated.length > 0) separated.push('divider')
    separated.push(item)
  })

  return (
    <>
      <div className={styles.overlay} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div
        ref={menuRef}
        className={styles.menu}
        style={{ left: position.x, top: position.y }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {separated.map((group, idx) => {
          if (group === 'divider') {
            return <div key={`div-${idx}`} className={styles.divider} />
          }
          const item = group as MenuItem
          return (
            <div
              key={item.key}
              className={item.disabled ? styles.itemDisabled : styles.item}
              onClick={() => {
                if (!item.disabled) {
                  item.action()
                  onClose()
                }
              }}
            >
              <Icon name={item.icon} size={15} />
              <span>{item.label}</span>
              {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
            </div>
          )
        })}
      </div>
    </>
  )
}
