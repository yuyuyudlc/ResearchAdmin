import { CheckSquareOutlined } from '@ant-design/icons'
import { Empty, List, Tag, Typography } from 'antd'

import type { TodoItem } from '../../../../shared/types/document'
import { useTodoPanel } from './hooks/useTodoPanel'
import styles from './style/index.module.css'

interface TodoPanelProps {
  todos: TodoItem[]
}

function TodoPanel({ todos }: TodoPanelProps) {
  const { priorityColorMap, statusColorMap } = useTodoPanel()

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <Typography.Title level={4} className={styles.title}>
          协作待办
        </Typography.Title>
        <Typography.Text type="secondary">围绕文档协作流程的个人任务追踪</Typography.Text>
      </header>

      <List
        dataSource={todos}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办任务" />,
        }}
        renderItem={(item) => (
          <List.Item className={styles.item}>
            <div className={styles.row}>
              <CheckSquareOutlined />
              <Typography.Text strong>{item.title}</Typography.Text>
            </div>
            <div className={styles.meta}>
              <Tag color={priorityColorMap[item.priority]}>{item.priority}优先</Tag>
              <Tag color={statusColorMap[item.status]}>{item.status}</Tag>
              <Typography.Text type="secondary">{item.dueDate}</Typography.Text>
            </div>
            <Typography.Text type="secondary">关联文档：{item.relatedDocTitle}</Typography.Text>
          </List.Item>
        )}
      />
    </section>
  )
}

export default TodoPanel
