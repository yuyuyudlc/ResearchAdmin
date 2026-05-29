import {
  Avatar,
  Button,
  Divider,
  Empty,
  Input,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import Icon from '../../../../components/Icon'
import type {
  CommentThread,
  PendingCommentSelection,
} from '../../hooks/commentThreads'
import { useDiscussionSidebar } from './hooks/useDiscussionSidebar'
import styles from './style/index.module.css'

const { Text } = Typography

interface Props {
  threads: CommentThread[]
  activeThreadId: string
  canEditDocument: boolean
  pendingSelection: PendingCommentSelection | null
  replying: boolean
  updatingThread: boolean
  onSelectThread: (threadId: string) => void
  onReply: (threadId: string, content: string, parentId: string | null) => Promise<void>
  onToggleThreadStatus: (threadId: string, status: 'open' | 'resolved') => Promise<void>
  onRelocateThread: (threadId: string) => Promise<void>
}

function formatDateTime(value: string): string {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString()
}

interface MessageTreeProps {
  thread: CommentThread
  parentId: string | null
  replyingToId: string
  replyContent: string
  canEditDocument: boolean
  replying: boolean
  onReply: (threadId: string, content: string, parentId: string | null) => Promise<void>
  onStartReply: (messageId: string) => void
  onChangeReply: (value: string) => void
  onCancelReply: () => void
}

function MessageTree({
  thread,
  parentId,
  replyingToId,
  replyContent,
  canEditDocument,
  replying,
  onReply,
  onStartReply,
  onChangeReply,
  onCancelReply,
}: MessageTreeProps) {
  const children = thread.messages.filter((message) => message.parentId === parentId)
  if (!children.length) {
    return null
  }

  return (
    <div className={styles.messageTree}>
      {children.map((message) => (
        <div key={message.id} className={styles.messageNode}>
          <div className={styles.messageCard}>
            <div className={styles.messageMeta}>
              <span className={styles.messageAuthor}>
                <Avatar
                  size={28}
                  src={message.author.avatarUrl}
                  style={{ backgroundColor: message.author.color }}
                >
                  {message.author.name.slice(0, 1).toUpperCase()}
                </Avatar>
                <span>
                  <Text strong>{message.author.name}</Text>
                  <br />
                  <Text type="secondary">{formatDateTime(message.createdAt)}</Text>
                </span>
              </span>

              {canEditDocument && (
                <Button type="link" onClick={() => onStartReply(message.id)}>
                  回复
                </Button>
              )}
            </div>

            <div className={styles.messageContent}>{message.content}</div>

            {replyingToId === message.id && (
              <div className={styles.replyComposer}>
                <Input.TextArea
                  rows={3}
                  value={replyContent}
                  onChange={(event) => onChangeReply(event.target.value)}
                  placeholder="继续回复，支持无限层级讨论。"
                  maxLength={600}
                />
                <Space style={{ marginTop: 10 }}>
                  <Button onClick={onCancelReply}>取消</Button>
                  <Button
                    type="primary"
                    loading={replying}
                    disabled={!replyContent.trim()}
                    onClick={() => onReply(thread.id, replyContent, message.id)}
                  >
                    发送回复
                  </Button>
                </Space>
              </div>
            )}
          </div>

          <MessageTree
            thread={thread}
            parentId={message.id}
            replyingToId={replyingToId}
            replyContent={replyContent}
            canEditDocument={canEditDocument}
            replying={replying}
            onReply={onReply}
            onStartReply={onStartReply}
            onChangeReply={onChangeReply}
            onCancelReply={onCancelReply}
          />
        </div>
      ))}
    </div>
  )
}

export default function DiscussionSidebar({
  threads,
  activeThreadId,
  canEditDocument,
  pendingSelection,
  replying,
  updatingThread,
  onSelectThread,
  onReply,
  onToggleThreadStatus,
  onRelocateThread,
}: Props) {
  const {
    replyingToId,
    replyContent,
    expandedResolvedIds,
    setReplyingToId,
    setReplyContent,
    toggleResolvedThread,
    clearReply,
  } = useDiscussionSidebar(threads)

  return (
    <div className={styles.sidebar}>
      <div className={styles.body}>
        {!threads.length ? (
          <div className={styles.empty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={canEditDocument ? '选中文本后发起第一条批注，团队讨论会在这里汇总。' : '当前没有讨论线程。'}
            />
          </div>
        ) : (
          <div className={styles.threadList}>
            {threads.map((thread) => {
              const isActive = thread.id === activeThreadId
              const isResolvedCollapsed = thread.status === 'resolved' && !expandedResolvedIds.includes(thread.id)
              const threadCardClassName = [
                styles.threadCard,
                isActive ? styles.threadCardActive : '',
              ].filter(Boolean).join(' ')

              return (
                <article key={thread.id} className={threadCardClassName}>
                  <div className={styles.threadHeader}>
                    <div className={styles.threadHeaderTop}>
                      <Space orientation="vertical" size={4}>
                        <Space wrap>
                          <Avatar
                            size={32}
                            src={thread.author.avatarUrl}
                            style={{ backgroundColor: thread.author.color }}
                          >
                            {thread.author.name.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <span>
                            <Text strong>{thread.author.name}</Text>
                            <br />
                            <Text type="secondary">{formatDateTime(thread.updatedAt)}</Text>
                          </span>
                        </Space>
                        <Space wrap>
                          <Tag color={thread.status === 'open' ? 'blue' : 'green'}>
                            {thread.status === 'open' ? '进行中' : '已解决'}
                          </Tag>
                          {thread.invalidAnchor && <Tag color="orange">锚点失效</Tag>}
                          <Tag>{thread.messages.length} 条消息</Tag>
                        </Space>
                      </Space>

                      <Space wrap>
                        <Tooltip title="定位到正文">
                          <Button type="text" onClick={() => onSelectThread(thread.id)}>
                            <Icon name="locate" size={16} />
                          </Button>
                        </Tooltip>
                        {thread.status === 'resolved' && (
                          <Button type="text" onClick={() => toggleResolvedThread(thread.id)}>
                            {isResolvedCollapsed ? '展开' : '折叠'}
                          </Button>
                        )}
                      </Space>
                    </div>

                    <div className={`${styles.threadAnchor} ${thread.invalidAnchor ? styles.threadAnchorInvalid : ''}`}>
                      {thread.invalidAnchor
                        ? '原始批注文本已被编辑或删除。你可以重新选择一段文本后点击“重新定位”。'
                        : `“${thread.anchorPreview || thread.anchorText}”`}
                    </div>
                  </div>

                  {!isResolvedCollapsed && (
                    <div className={styles.threadBody}>
                      <Space wrap style={{ marginBottom: 12 }}>
                        <Button type="link" onClick={() => onSelectThread(thread.id)}>
                          跳转到正文
                        </Button>
                        {canEditDocument && (
                          <Button
                            type="link"
                            loading={updatingThread}
                            onClick={() => onToggleThreadStatus(thread.id, thread.status === 'open' ? 'resolved' : 'open')}
                          >
                            {thread.status === 'open' ? '标记已解决' : '重新打开'}
                          </Button>
                        )}
                        {canEditDocument && thread.invalidAnchor && (
                          <Button
                            type="link"
                            loading={updatingThread}
                            disabled={!pendingSelection || !!pendingSelection.blockedReason}
                            onClick={() => onRelocateThread(thread.id)}
                          >
                            重新定位
                          </Button>
                        )}
                        {canEditDocument && (
                          <Button type="link" onClick={() => setReplyingToId(thread.messages[0]?.id || thread.id)}>
                            回复线程
                          </Button>
                        )}
                      </Space>

                      <MessageTree
                        thread={thread}
                        parentId={null}
                        replyingToId={replyingToId}
                        replyContent={replyContent}
                        canEditDocument={canEditDocument}
                        replying={replying}
                        onReply={onReply}
                        onStartReply={setReplyingToId}
                        onChangeReply={setReplyContent}
                        onCancelReply={clearReply}
                      />

                      {replyingToId === thread.id && (
                        <>
                          <Divider />
                          <Input.TextArea
                            rows={3}
                            value={replyContent}
                            onChange={(event) => setReplyContent(event.target.value)}
                            placeholder="直接回复整个线程。"
                            maxLength={600}
                          />
                          <Space style={{ marginTop: 10 }}>
                            <Button onClick={clearReply}>取消</Button>
                            <Button
                              type="primary"
                              loading={replying}
                              disabled={!replyContent.trim()}
                              onClick={() => onReply(thread.id, replyContent, null)}
                            >
                              发送回复
                            </Button>
                          </Space>
                        </>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
