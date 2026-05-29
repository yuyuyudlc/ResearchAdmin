import { useEffect, useState } from 'react'
import { EditorContent } from '@tiptap/react'
import {
  Alert,
  App,
  Avatar,
  Button,
  Drawer,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popover,
  Result,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'

import {
  useDocumentEditor,
  type DocumentMetaValues,
} from './hooks/useDocumentEditor'
import ACLModal from './components/ACLModal'
import CommentSelectionBubble from './components/CommentSelectionBubble'
import DocumentSidebar from './components/DocumentSidebar'
import TiptapToolbar from './components/TiptapWangToolbar'
import { PdfViewer, WordEditor, ExcelEditor, PptxViewer, AudioViewer, VideoViewer, DatasetViewer } from './file-viewers'
import Icon from '../../components/Icon'
import { documentService } from '../../services'
import { canManage } from '../../services/types'
import styles from './style/index.module.css'

const { Text, Title } = Typography

interface MoveFormValues {
  parentId: string
  sortOrder: number
}

export default function DocumentEditorPage() {
  const { message } = App.useApp()
  const screens = Grid.useBreakpoint()
  const isDesktopDiscussion = !!screens.xl
  const [form] = Form.useForm<DocumentMetaValues>()
  const [moveForm] = Form.useForm<MoveFormValues>()
  const [metaOpen, setMetaOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [aclOpen, setAclOpen] = useState(false)
  const [discussionOpen, setDiscussionOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const [creatingComment, setCreatingComment] = useState(false)
  const [replying, setReplying] = useState(false)
  const [updatingThread, setUpdatingThread] = useState(false)
  const {
    document,
    editor,
    bodyData,
    bodyType,
    bodyLoading,
    loading,
    saving,
    updating,
    lastSaved,
    error,
    threads,
    activeThreadId,
    pendingSelection,
    collaborators,
    providerStatus,
    canEditDocument,
    activeSpreadsheet,
    spreadsheetLoading,
    spreadsheetError,
    fetchDocument,
    saveBody,
    saveFileBody,
    updateMeta,
    createThread,
    replyToThread,
    setThreadStatus,
    relocateThread,
    focusThread,
    setActiveThreadId,
    setPendingSelection,
    deleteDocument,
    archiveDocument,
    restoreDocument,
    moveDocument,
    downloadDocument,
    insertSpreadsheetBlock,
    updateSpreadsheetBlock,
    refreshActiveSpreadsheet,
    exportActiveSpreadsheet,
    handleBack,
  } = useDocumentEditor()

  useEffect(() => {
    if (document && metaOpen) {
      form.setFieldsValue({
        title: document.title,
        summary: document.summary,
      })
    }
  }, [document, form, metaOpen])

  useEffect(() => {
    if (document && moveOpen) {
      moveForm.setFieldsValue({
        parentId: document.parentId || '',
        sortOrder: document.sortOrder || 0,
      })
    }
  }, [document, moveForm, moveOpen])

  useEffect(() => {
    if (isDesktopDiscussion) {
      setDiscussionOpen(false)
    }
  }, [isDesktopDiscussion])

  if (loading) {
    return (
      <div className={styles.center}>
        <Spin description="加载文档中..." />
      </div>
    )
  }

  if (error && !document) {
    return (
      <Result
        status="error"
        title="文档加载失败"
        subTitle={error}
        extra={[
          <Button key="retry" type="primary" onClick={fetchDocument}>
            重试
          </Button>,
          <Button key="back" onClick={handleBack}>
            返回工作区
          </Button>,
        ]}
      />
    )
  }

  if (!editor && document?.docType === 'rich_text') {
    return (
      <div className={styles.center}>
        <Spin description="初始化编辑器..." />
      </div>
    )
  }

  const submitMeta = async () => {
    const values = await form.validateFields()
    try {
      await updateMeta(values)
      setMetaOpen(false)
      message.success('文档信息已更新')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '更新失败')
    }
  }

  const submitMove = async () => {
    const values = await moveForm.validateFields()
    try {
      setMoving(true)
      await moveDocument(values.parentId.trim() || null, Number(values.sortOrder) || 0)
      setMoveOpen(false)
      message.success('文档已移动')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移动失败')
    } finally {
      setMoving(false)
    }
  }

  const confirmDelete = () => {
    Modal.confirm({
      title: '删除文档',
      content: `确定要删除文档「${document?.title || '未命名文档'}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: deleteDocument,
    })
  }

  const confirmArchive = () => {
    Modal.confirm({
      title: '归档文档',
      content: `确定要归档文档「${document?.title || '未命名文档'}」吗？`,
      okText: '归档',
      cancelText: '取消',
      onOk: archiveDocument,
    })
  }

  const handleRestore = async () => {
    try {
      await restoreDocument()
      message.success('文档已恢复')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '恢复失败')
    }
  }

  const handleDownload = async () => {
    if (!document?.id) {
      return
    }
    try {
      message.loading({ content: '正在准备下载...', key: 'downloading', duration: 0 })
      const data = await downloadDocument()
      if (data?.sourceStorageKey) {
        const buffer = await documentService.getBody(document.id)
        const blob = new Blob([buffer], { type: 'application/octet-stream' })
        const url = window.URL.createObjectURL(blob)
        const link = window.document.createElement('a')
        link.href = url
        link.download = data.sourceStorageKey
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        message.success({ content: '下载成功', key: 'downloading' })
      } else {
        message.info({ content: '该文档无可下载的源文件', key: 'downloading' })
      }
    } catch (err) {
      message.error({ content: err instanceof Error ? err.message : '下载失败', key: 'downloading' })
    }
  }

  const handleSaveFileBody = async (data: Uint8Array) => {
    if (!bodyType) {
      throw new Error('无法确定文件类型')
    }
    await saveFileBody(data, bodyType)
  }

  const handleCreateCommentThread = async (content: string) => {
    try {
      setCreatingComment(true)
      await createThread(content)
      message.success('批注线程已创建')
      if (!isDesktopDiscussion) {
        setDiscussionOpen(true)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建批注失败')
    } finally {
      setCreatingComment(false)
    }
  }

  const handleReplyThread = async (threadId: string, content: string, parentId: string | null) => {
    try {
      setReplying(true)
      await replyToThread(threadId, content, parentId)
      message.success('回复已发送')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '回复失败')
    } finally {
      setReplying(false)
    }
  }

  const handleToggleThreadStatus = async (threadId: string, status: 'open' | 'resolved') => {
    try {
      setUpdatingThread(true)
      await setThreadStatus(threadId, status)
      message.success(status === 'resolved' ? '线程已标记为已解决' : '线程已重新打开')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '状态更新失败')
    } finally {
      setUpdatingThread(false)
    }
  }

  const handleRelocateThread = async (threadId: string) => {
    try {
      setUpdatingThread(true)
      await relocateThread(threadId)
      message.success('批注锚点已重新定位')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '重新定位失败')
    } finally {
      setUpdatingThread(false)
    }
  }

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId)
    focusThread(threadId)
    if (!isDesktopDiscussion) {
      setDiscussionOpen(true)
    }
  }

  const renderDocumentSidebar = () => (
    <DocumentSidebar
      threads={threads}
      activeThreadId={activeThreadId}
      collaborators={collaborators}
      providerStatus={providerStatus}
      canEditDocument={canEditDocument}
      pendingSelection={pendingSelection}
      replying={replying}
      updatingThread={updatingThread}
      onSelectThread={handleSelectThread}
      onReply={handleReplyThread}
      onToggleThreadStatus={handleToggleThreadStatus}
      onRelocateThread={handleRelocateThread}
      spreadsheet={activeSpreadsheet}
      spreadsheetLoading={spreadsheetLoading}
      spreadsheetError={spreadsheetError}
      onInsertSpreadsheetBlock={insertSpreadsheetBlock}
      onPatchSpreadsheetBlock={updateSpreadsheetBlock}
      onRefreshSpreadsheet={refreshActiveSpreadsheet}
      onExportSpreadsheet={exportActiveSpreadsheet}
    />
  )

  const isArchived = document?.status === 'archived'
  const isRichText = document?.docType === 'rich_text'
  const isFile = document?.docType === 'file'
  const hasViewer = isFile && bodyType && bodyType !== 'yjs_state'
  const onlineUserContent = (
    <div className={styles.onlinePopover}>
      {collaborators.length === 0 ? (
        <Text type="secondary">暂无在线协作者</Text>
      ) : (
        <Space direction="vertical" size={4}>
          {collaborators.map((collaborator) => (
            <span key={collaborator.clientId} className={styles.onlineUser}>
              <Avatar
                size={20}
                src={collaborator.avatarUrl}
                className={styles.onlineAvatar}
                style={{ backgroundColor: collaborator.color }}
              >
                {collaborator.name.trim().slice(0, 1).toUpperCase()}
              </Avatar>
              <span>
                {collaborator.name}
                {collaborator.isCurrentUser ? ' (你)' : ''}
              </span>
            </span>
          ))}
        </Space>
      )}
    </div>
  )

  const renderFileViewer = () => {
    if (bodyLoading) {
      return (
        <div className={styles.center} style={{ minHeight: 400 }}>
          <Spin description="加载文件内容..." />
        </div>
      )
    }
    if (!bodyData) {
      return (
        <div className={styles.fileShell}>
          <Result
            icon={<Icon name="file" size={72} style={{ color: '#1677ff' }} />}
            title={document?.title || '未命名附件'}
            subTitle="文件内容加载失败，请尝试刷新或重新下载"
            extra={
              <Button type="primary" size="large" onClick={handleDownload}>
                下载附件源文件
              </Button>
            }
          />
        </div>
      )
    }

    switch (bodyType) {
      case 'pdf':
        return <PdfViewer data={bodyData} />
      case 'word':
        return (
          <WordEditor
            data={bodyData}
            filename={document?.sourceStorageKey}
            onSave={handleSaveFileBody}
            saving={saving}
          />
        )
      case 'excel':
        return (
          <ExcelEditor
            data={bodyData}
            onSave={handleSaveFileBody}
            saving={saving}
          />
        )
      case 'ppt':
        return <PptxViewer data={bodyData} filename={document?.sourceStorageKey} />
      case 'audio':
        return <AudioViewer data={bodyData} filename={document?.sourceStorageKey} />
      case 'video':
        return <VideoViewer data={bodyData} filename={document?.sourceStorageKey} />
      case 'dataset':
        return <DatasetViewer data={bodyData} filename={document?.sourceStorageKey} />
      default:
        return (
          <div className={styles.fileShell}>
            <Result
              icon={<Icon name="file" size={72} style={{ color: '#1677ff' }} />}
              title={document?.title || '未命名附件'}
              subTitle={
                document?.summary
                  ? `文件描述：${document.summary}`
                  : '当前文件为附件格式，不支持在线预览。请下载后查看或使用专业软件进行编辑。'
              }
              extra={
                <Button type="primary" size="large" onClick={handleDownload}>
                  下载附件源文件
                </Button>
              }
            />
          </div>
        )
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.titleBlock}>
          <Button type="link" className={styles.backButton} onClick={handleBack}>
            返回工作区
          </Button>
          <Title level={3} className={styles.docTitle}>
            {document?.title || '未命名文档'}
          </Title>
          <Space size={8} wrap>
            <Tag>{isRichText ? '富文本' : bodyType ? bodyType.toUpperCase() : document?.docType || '文档'}</Tag>
            {isArchived && <Tag color="orange">已归档</Tag>}
            {providerStatus === 'connected' && isRichText && (
              <Popover content={onlineUserContent} title="在线成员" placement="bottomLeft">
                <Tag color="blue">在线 {collaborators.length} 人</Tag>
              </Popover>
            )}
            {lastSaved && (
              <Text type="secondary">上次保存: {lastSaved.toLocaleTimeString()}</Text>
            )}
          </Space>
        </div>

        <Space wrap>
          {isRichText && (
            <Button
              type="primary"
              loading={saving}
              onClick={() =>
                saveBody().then(() => message.success('文档已保存'))
              }
            >
              保存
            </Button>
          )}
          {isRichText && (
            <Button
              icon={<Icon name="table" size={14} />}
              onClick={insertSpreadsheetBlock}
              disabled={!canEditDocument}
            >
              插入多维表格
            </Button>
          )}
          <Button
            icon={<Icon name="discussion" size={14} />}
            onClick={() => setDiscussionOpen(true)}
          >
            讨论 {threads.length > 0 ? `(${threads.length})` : ''}
          </Button>
          <Button onClick={() => setMetaOpen(true)}>文档信息</Button>
          <Button onClick={() => setMoveOpen(true)}>移动</Button>
          <Button
            disabled={!document || !canManage(document.permissionBit)}
            onClick={() => setAclOpen(true)}
          >
            权限
          </Button>
          <Button onClick={handleDownload}>下载</Button>
          {isArchived ? (
            <Button onClick={handleRestore}>恢复</Button>
          ) : (
            <Button onClick={confirmArchive}>归档</Button>
          )}
          <Button danger onClick={confirmDelete}>
            删除
          </Button>
        </Space>
      </div>

      {error && document && (
        <Alert className={styles.alert} type="error" message={error} showIcon />
      )}

      {isRichText ? (
        <>
          <div className={styles.contentShell}>
            <div className={styles.editorColumn}>
              <div className={styles.editorShell}>
                <div className="tiptap-toolbar-wrapper">
                  <TiptapToolbar editor={editor} disabled={!canEditDocument} />
                </div>
                <EditorContent editor={editor} />
                <CommentSelectionBubble
                  selection={pendingSelection}
                  creating={creatingComment}
                  onSubmit={handleCreateCommentThread}
                  onCancel={() => setPendingSelection(null)}
                />
              </div>
            </div>

            {isDesktopDiscussion && (
              <div className={styles.sidebarColumn}>
                {renderDocumentSidebar()}
              </div>
            )}
          </div>

          {!isDesktopDiscussion && (
            <Drawer
              title="文档侧栏"
              placement="right"
              open={discussionOpen}
              onClose={() => setDiscussionOpen(false)}
              size="large"
            >
              {renderDocumentSidebar()}
            </Drawer>
          )}
        </>
      ) : hasViewer ? (
        renderFileViewer()
      ) : (
        <div className={styles.fileShell}>
          <Result
            icon={<Icon name="file" size={72} style={{ color: '#1677ff' }} />}
            title={document?.title || '未命名附件'}
            subTitle={
              document?.summary
                ? `文件描述：${document.summary}`
                : '当前文件为附件格式，不支持在线预览。请下载后查看或使用专业软件进行编辑。'
            }
            extra={
              <Button type="primary" size="large" onClick={handleDownload}>
                下载附件源文件
              </Button>
            }
          />
        </div>
      )}

      <Modal
        title="文档信息"
        open={metaOpen}
        onCancel={() => setMetaOpen(false)}
        onOk={submitMeta}
        confirmLoading={updating}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          <Form.Item label="摘要" name="summary">
            <Input.TextArea rows={4} placeholder="请输入文档摘要" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="移动文档"
        open={moveOpen}
        onCancel={() => setMoveOpen(false)}
        onOk={submitMove}
        confirmLoading={moving}
        destroyOnHidden
        okText="移动"
        cancelText="取消"
      >
        <Form form={moveForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="目标父节点 ID"
            name="parentId"
            tooltip="移动到根目录请填空字符串，否则填目标文件夹/文档 ID"
          >
            <Input placeholder="为空表示根目录" />
          </Form.Item>
          <Form.Item label="排序" name="sortOrder">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <ACLModal
        open={aclOpen}
        documentId={document?.id}
        onClose={() => setAclOpen(false)}
      />
    </div>
  )
}
