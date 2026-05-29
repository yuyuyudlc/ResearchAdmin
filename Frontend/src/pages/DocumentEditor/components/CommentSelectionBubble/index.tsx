import { Button, Input, Space, Typography } from 'antd'
import Icon from '../../../../components/Icon'
import type { PendingCommentSelection } from '../../hooks/commentThreads'
import { useCommentSelectionBubble } from './hooks/useCommentSelectionBubble'
import styles from './style/index.module.css'

const { Text } = Typography

interface Props {
  selection: PendingCommentSelection | null
  creating: boolean
  onSubmit: (content: string) => Promise<void>
  onCancel: () => void
}

export default function CommentSelectionBubble({
  selection,
  creating,
  onSubmit,
  onCancel,
}: Props) {
  const open = !!selection
  const { content, setContent } = useCommentSelectionBubble(open)

  if (!selection) {
    return null
  }

  return (
    <div
      className={styles.bubble}
      style={{
        top: selection.top,
        left: selection.left,
      }}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          <Icon name="comment" size={16} color="#0070f3" />
          添加批注
        </span>
        {selection.blockedReason ? (
          <Text type="danger">{selection.blockedReason}</Text>
        ) : (
          <Text type="secondary">将创建一个新的讨论线程</Text>
        )}
      </div>

      <blockquote className={styles.quote}>“{selection.text.slice(0, 120)}”</blockquote>

      <Input.TextArea
        rows={4}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="输入你的批注内容，团队成员会围绕这段文字展开讨论。"
        maxLength={600}
      />

      <Space className={styles.actions}>
        <Button onClick={onCancel}>取消</Button>
        <Button
          type="primary"
          loading={creating}
          disabled={!content.trim() || !!selection.blockedReason}
          onClick={() => onSubmit(content)}
        >
          发起讨论
        </Button>
      </Space>
    </div>
  )
}
