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