import type { Editor } from '@tiptap/core'
import type { IconName } from '../../../../components/Icon'

export interface MenuItem {
  key: string
  label: string
  icon: IconName
  shortcut?: string
  disabled?: boolean
  action: () => void
}

export function buildContextMenuItems(
  editor: Editor | null,
  hasSelection: boolean,
  onComment: () => void,
  canEdit: boolean,
): MenuItem[] {
  const groups: MenuItem[][] = [
    [
      {
        key: 'comment',
        label: '添加评论',
        icon: 'comment',
        disabled: !hasSelection || !canEdit,
        action: onComment,
      },
    ],
    [
      {
        key: 'bold',
        label: '加粗',
        icon: 'bold',
        shortcut: 'Ctrl+B',
        disabled: !canEdit,
        action: () => editor?.chain().focus().toggleBold().run(),
      },
      {
        key: 'italic',
        label: '斜体',
        icon: 'italic',
        shortcut: 'Ctrl+I',
        disabled: !canEdit,
        action: () => editor?.chain().focus().toggleItalic().run(),
      },
      {
        key: 'underline',
        label: '下划线',
        icon: 'underline',
        shortcut: 'Ctrl+U',
        disabled: !canEdit,
        action: () => editor?.chain().focus().toggleUnderline().run(),
      },
      {
        key: 'strike',
        label: '删除线',
        icon: 'strike',
        disabled: !canEdit,
        action: () => editor?.chain().focus().toggleStrike().run(),
      },
    ],
    [
      {
        key: 'copy',
        label: '复制',
        icon: 'edit',
        shortcut: 'Ctrl+C',
        disabled: !hasSelection,
        action: () => {
          try {
            document.execCommand('copy')
          } catch { /* ignore */ }
        },
      },
      {
        key: 'cut',
        label: '剪切',
        icon: 'edit',
        shortcut: 'Ctrl+X',
        disabled: !hasSelection || !canEdit,
        action: () => {
          try {
            document.execCommand('cut')
          } catch { /* ignore */ }
        },
      },
      {
        key: 'paste',
        label: '粘贴',
        icon: 'edit',
        shortcut: 'Ctrl+V',
        disabled: !canEdit,
        action: async () => {
          try {
            const text = await navigator.clipboard.readText()
            if (text && editor) {
              editor.chain().focus().insertContent(text).run()
            }
          } catch { /* ignore */ }
        },
      },
    ],
  ]

  return groups.flat()
}
