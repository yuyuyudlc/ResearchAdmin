import { FileSearchOutlined } from '@ant-design/icons'
import { Alert, Empty, Table, Typography } from 'antd'

import type { DocumentItem } from '../../../../shared/types/document'
import { useDocumentWorkspace } from './hooks/useDocumentWorkspace'
import styles from './style/index.module.css'

interface DocumentWorkspaceProps {
  loading: boolean
  documents: DocumentItem[]
  dataSource: 'live' | 'mock'
  onOpenEditor: (doc: DocumentItem) => void
}

function DocumentWorkspace({
  loading,
  documents,
  dataSource,
  onOpenEditor,
}: DocumentWorkspaceProps) {
  const { columns } = useDocumentWorkspace({ onOpenEditor })

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <Typography.Title level={4} className={styles.title}>
          文档列表
        </Typography.Title>
        <Typography.Text type="secondary">
          按标题、项目、负责人和阶段快速检索，并直接进入文档编辑页面。
        </Typography.Text>
      </header>

      {dataSource === 'mock' ? (
        <Alert
          showIcon
          type="info"
          className={styles.alert}
          message="当前使用 Mock 数据"
          description="将 src/shared/config.ts 中 useMock 调整为 false 后可切换为后端数据模式。"
        />
      ) : null}

      <Table<DocumentItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={documents}
        pagination={{ pageSize: 6, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="未找到符合条件的文档"
              imageStyle={{ height: 56 }}
            >
              <FileSearchOutlined />
            </Empty>
          ),
        }}
        scroll={{ x: 920 }}
      />
    </section>
  )
}

export default DocumentWorkspace
