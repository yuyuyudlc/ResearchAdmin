import { Descriptions, Drawer, Empty, Space, Tag, Typography } from 'antd'

import type { DocumentItem } from '../../../../shared/types/document'
import { useDocumentDetailDrawer } from './hooks/useDocumentDetailDrawer'
import styles from './style/index.module.css'

interface DocumentDetailDrawerProps {
  open: boolean
  document: DocumentItem | null
  onClose: () => void
}

function DocumentDetailDrawer({ open, document, onClose }: DocumentDetailDrawerProps) {
  const { emptyText } = useDocumentDetailDrawer()

  return (
    <Drawer
      open={open}
      width={560}
      title={document ? `文档详情 - ${document.title}` : '文档详情'}
      onClose={onClose}
    >
      {!document ? (
        <Empty description={emptyText} />
      ) : (
        <div className={styles.wrap}>
          <Typography.Paragraph>{document.summary}</Typography.Paragraph>
          <Space wrap>
            {document.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>

          <Descriptions
            className={styles.desc}
            column={1}
            size="small"
            items={[
              { key: 'project', label: '所属项目', children: document.projectName },
              { key: 'stage', label: '研究阶段', children: document.stage },
              { key: 'owner', label: '负责人', children: document.ownerName },
              { key: 'permission', label: '权限', children: document.permissionLabel },
              { key: 'status', label: '状态', children: document.status },
              { key: 'type', label: '类型', children: document.docType === 'file' ? '文件文档' : '在线文档' },
              { key: 'size', label: '文件大小', children: document.sizeLabel },
              { key: 'version', label: '历史版本', children: `${document.versionCount} 个` },
              { key: 'comments', label: '评论数量', children: `${document.commentCount} 条` },
              { key: 'operator', label: '最后操作人', children: document.lastOperator },
              { key: 'updated', label: '更新时间', children: document.updatedAt },
            ]}
          />
        </div>
      )}
    </Drawer>
  )
}

export default DocumentDetailDrawer
