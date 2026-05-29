import { Icon as IconifyIcon } from '@iconify/react'
import type { CSSProperties } from 'react'

export type IconName =
  | 'home'
  | 'user'
  | 'team'
  | 'caret-down'
  | 'caret-right'
  | 'file'
  | 'folder'
  | 'folder-open'
  | 'plus'
  | 'more'
  | 'refresh'
  | 'search'
  | 'settings'
  | 'comment'
  | 'discussion'
  | 'check'
  | 'locate'
  | 'table'
  | 'filter'
  | 'download'
  | 'edit'
  | 'drag'
  | 'sort'
  | 'close'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'blockquote'
  | 'list-ul'
  | 'list-ol'
  | 'hr'
  | 'undo'
  | 'redo'
  | 'heading'
  | 'paragraph'
  | 'underline'
  | 'highlight'
  | 'link'
  | 'superscript'
  | 'subscript'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-justify'
  | 'indent'
  | 'outdent'
  | 'task'
  | 'text-color'
  | 'table-insert'

const ICON_MAP: Record<IconName, string> = {
  home: 'solar:home-2-linear',
  user: 'solar:user-linear',
  team: 'solar:users-group-rounded-linear',
  'caret-down': 'mdi:chevron-down',
  'caret-right': 'mdi:chevron-right',
  file: 'solar:document-linear',
  folder: 'solar:folder-linear',
  'folder-open': 'solar:folder-open-linear',
  plus: 'mdi:plus',
  more: 'mdi:dots-horizontal',
  refresh: 'mdi:refresh',
  search: 'mdi:magnify',
  settings: 'mdi:cog-outline',
  comment: 'solar:chat-round-line-linear',
  discussion: 'solar:chat-square-like-linear',
  check: 'solar:check-circle-linear',
  locate: 'solar:map-point-wave-linear',
  table: 'mdi:table',
  filter: 'mdi:filter-outline',
  download: 'mdi:download',
  edit: 'mdi:pencil-outline',
  drag: 'mdi:drag',
  sort: 'mdi:sort-variant',
  close: 'mdi:close',
  bold: 'mdi:format-bold',
  italic: 'mdi:format-italic',
  strike: 'mdi:format-strikethrough-variant',
  code: 'mdi:code-tags',
  blockquote: 'mdi:format-quote-open',
  'list-ul': 'mdi:format-list-bulleted',
  'list-ol': 'mdi:format-list-numbered',
  hr: 'mdi:minus',
  undo: 'mdi:undo',
  redo: 'mdi:redo',
  heading: 'mdi:format-header-1',
  paragraph: 'mdi:format-paragraph',
  underline: 'mdi:format-underline',
  highlight: 'mdi:format-color-highlight',
  link: 'mdi:link-variant',
  superscript: 'mdi:format-superscript',
  subscript: 'mdi:format-subscript',
  'align-left': 'mdi:format-align-left',
  'align-center': 'mdi:format-align-center',
  'align-right': 'mdi:format-align-right',
  'align-justify': 'mdi:format-align-justify',
  indent: 'mdi:format-indent-increase',
  outdent: 'mdi:format-indent-decrease',
  task: 'mdi:format-list-checks',
  'text-color': 'mdi:format-color-text',
  'table-insert': 'mdi:table-plus',
}

interface Props {
  name: IconName
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export default function Icon({ name, size = 16, color, className, style }: Props) {
  return (
    <IconifyIcon
      icon={ICON_MAP[name]}
      width={size}
      height={size}
      color={color}
      className={className}
      style={style}
    />
  )
}
