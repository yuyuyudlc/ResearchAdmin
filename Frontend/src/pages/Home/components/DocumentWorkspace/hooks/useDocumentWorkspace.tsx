import type { TableColumnsType } from 'antd'
import { Button, Tag } from 'antd'

import type { DocumentItem } from '../../../../../shared/types/document'

interface UseDocumentWorkspaceOptions {
  onOpenEditor: (doc: DocumentItem) => void
}

export function useDocumentWorkspace({ onOpenEditor }: UseDocumentWorkspaceOptions) {
  const columns: TableColumnsType<DocumentItem> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 280,
    },
    {
      title: '所属项目',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 180,
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 120,
    },
    {
      title: '负责人',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 110,
    },
    {
      title: '权限',
      dataIndex: 'permissionLabel',
      key: 'permissionLabel',
      width: 110,
      render: (value: string) => (
        <Tag color={value === '可编辑' ? 'processing' : 'default'}>{value}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: string) => <Tag color={statusColorMap[value] ?? 'default'}>{value}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => <Button type="link" onClick={() => onOpenEditor(record)}>进入编辑页</Button>,
    },
  ]

  return {
    columns,
  }
}

const statusColorMap: Record<string, string> = {
  进行中: 'processing',
  已归档: 'default',
  待审核: 'warning',
}
