import { useEffect, useState } from 'react'
import { EditorContent } from '@tiptap/react'
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
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
import Icon from '../../components/Icon'
import { documentService } from '../../services'
import styles from './style/index.module.css'

const { Text, Title } = Typography

interface MoveFormValues {
  parentId: string
  sortOrder: number
}

export default function DocumentEditorPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<DocumentMetaValues>()
  const [moveForm] = Form.useForm<MoveFormValues>()
  const [metaOpen, setMetaOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [aclOpen, setAclOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const {
    document,
    editor,
    loading,
    saving,
    updating,
    lastSaved,
    error,
    fetchDocument,
    saveBody,
    updateMeta,
    deleteDocument,
    archiveDocument,
    restoreDocument,
    moveDocument,
    downloadDocument,
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

  if (loading) {
    return (
      <div className={styles.center}>
        <Spin tip="加载文档中..." />
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
        <Spin tip="初始化编辑器..." />
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
    if (!document?.id) return
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

  const isArchived = document?.status === 'archived'

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
            <Tag>{document?.docType === 'rich_text' ? '富文本' : document?.docType || '文档'}</Tag>
            {isArchived && <Tag color="orange">已归档</Tag>}
            {lastSaved && (
              <Text type="secondary">上次保存: {lastSaved.toLocaleTimeString()}</Text>
            )}
          </Space>
        </div>

        <Space wrap>
          {document?.docType === 'rich_text' && (
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
          <Button onClick={() => setMetaOpen(true)}>文档信息</Button>
          <Button onClick={() => setMoveOpen(true)}>移动</Button>
          <Button onClick={() => setAclOpen(true)}>权限</Button>
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

      {document?.docType === 'rich_text' ? (
        <div className={styles.editorShell}>
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className={styles.fileShell}>
          <Result
            icon={<Icon name="file" size={72} style={{ color: '#1677ff' }} />}
            title={document?.title || '未命名附件'}
            subTitle={
              document?.summary
                ? `文件描述：${document.summary}`
                : '当前文件为附件格式，不支持在线编辑。请下载后查看或使用专业软件进行编辑。'
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