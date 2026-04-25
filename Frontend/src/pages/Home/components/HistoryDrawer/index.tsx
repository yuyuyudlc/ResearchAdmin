import { Button, Drawer, Empty, List, Space, Tag, Typography } from 'antd'

import type { DocumentItem } from '../../../../shared/types/document'
import { useHistoryDrawer } from './hooks/useHistoryDrawer'
import styles from './style/index.module.css'

interface HistoryDrawerProps {
  open: boolean
  document: DocumentItem | null
  onClose: () => void
}

function HistoryDrawer({ open, document, onClose }: HistoryDrawerProps) {
  const historyList = useHistoryDrawer(document)

  return (
    <Drawer
      open={open}
      width={560}
      title={document ? `历史记录 - ${document.title}` : '历史记录'}
      onClose={onClose}
    >
      {!document ? (
        <Empty description="请选择文档后查看历史记录" />
      ) : (
        <List
          dataSource={historyList}
          renderItem={(item) => (
            <List.Item className={styles.item}>
              <Space direction="vertical" size={2}>
                <Space>
                  <Tag color="processing">v{item.versionNo}</Tag>
                  <Typography.Text strong>{item.summary}</Typography.Text>
                </Space>
                <Typography.Text type="secondary">
                  操作人：{item.operator} | 时间：{item.timestamp}
                </Typography.Text>
                <Button size="small" type="link">
                  恢复到该版本（Mock）
                </Button>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  )
}

export default HistoryDrawer
