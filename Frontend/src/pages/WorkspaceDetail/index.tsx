import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd'
import type { UploadProps } from 'antd'
import type { DocumentNode } from '../../services/types'
import {
  useWorkspaceDetail,
  type CreateDocFormValues,
} from './hooks/useWorkspaceDetail'
import Icon from '../../components/Icon'
import styles from './style/index.module.css'

const { Text, Title } = Typography

function formatTime(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

function docTypeLabel(type: string): string {
  switch (type) {
    case 'folder':
      return '文件夹'
    case 'rich_text':
      return '富文本'
    case 'file':
      return '附件'
    default:
      return type || '文档'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'archived':
      return '已归档'
    case 'deleted':
      return '已删除'
    default:
      return '正常'
  }
}

export default function WorkspaceDetailPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [form] = Form.useForm<CreateDocFormValues>()
  const [createOpen, setCreateOpen] = useState(false)

  const {
    directory,
    parentId,
    pathStack,
    loading,
    submitting,
    error,
    refresh,
    enterFolder,
    goToRoot,
    goToBreadcrumb,
    createDocument,
    uploadDocument,
    archive,
    restore,
    remove,
    openDocument,
  } = useWorkspaceDetail(workspaceId)

  const workspace = directory?.workspace
  const member = directory?.currentMember
  const canManage = member?.role === 'owner'
  const items = directory?.items ?? []

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ docType: 'rich_text' })
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    const values = await form.validateFields()
    try {
      const doc = await createDocument(values)
      setCreateOpen(false)
      form.resetFields()
      message.success('文档已创建')
      if (doc && doc.docType !== 'folder') {
        navigate(`/documents/${doc.id}`)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败')
    }
  }

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const doc = await uploadDocument(file as File)
        message.success('文档已上传')
        onSuccess?.(doc, new XMLHttpRequest())
      } catch (err) {
        message.error(err instanceof Error ? err.message : '上传失败')
        onError?.(err as Error)
      }
    },
  }

  const confirmArchive = (node: DocumentNode) => {
    Modal.confirm({
      title: '归档文档',
      content: `确定要归档「${node.title || '未命名'}」吗？`,
      okText: '归档',
      cancelText: '取消',
      onOk: async () => {
        await archive(node.id)
        message.success('文档已归档')
      },
    })
  }

  const handleRestore = async (node: DocumentNode) => {
    await restore(node.id)
    message.success('文档已恢复')
  }

  const confirmDelete = (node: DocumentNode) => {
    Modal.confirm({
      title: '删除文档',
      content: `确定要删除「${node.title || '未命名'}」吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await remove(node.id)
        message.success('文档已删除')
      },
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Button type="link" className={styles.back} onClick={() => navigate('/workspaces')}>
            ← 返回工作区列表
          </Button>
          <Title level={2} className={styles.title}>
            {workspace?.name || '工作区'}
          </Title>
          <Text type="secondary">{workspace?.description || '暂无描述'}</Text>
        </div>
        <Space wrap>
          <Button onClick={refresh}>刷新</Button>
          {canManage && (
            <Upload {...uploadProps}>
              <Button>上传文件</Button>
            </Upload>
          )}
          {canManage && (
            <Button type="primary" onClick={openCreate}>
              新建文档
            </Button>
          )}
        </Space>
      </div>

      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <a onClick={goToRoot}>根目录</a> },
          ...pathStack.map((node, index) => ({
            title:
              index === pathStack.length - 1 ? (
                <span>{node.title || '未命名'}</span>
              ) : (
                <a onClick={() => goToBreadcrumb(index)}>{node.title || '未命名'}</a>
              ),
          })),
        ]}
      />

      {error && (
        <Alert
          className={styles.alert}
          type="error"
          message={error}
          showIcon
          action={<Button onClick={refresh}>重试</Button>}
        />
      )}

      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description={parentId ? '该目录为空' : '工作区暂无文档'}>
            {canManage && (
              <Button type="primary" onClick={openCreate}>
                新建文档
              </Button>
            )}
          </Empty>
        ) : (
          <List
            className={styles.list}
            dataSource={items}
            renderItem={(node) => {
              const isFolder = node.docType === 'folder'
              const actions = [
                <Button
                  type="link"
                  onClick={() =>
                    isFolder ? enterFolder(node) : openDocument(node)
                  }
                >
                  {isFolder ? '进入' : '打开'}
                </Button>,
              ]

              if (canManage) {
                actions.push(
                  <Dropdown
                    menu={{
                      items: [
                        node.status === 'archived'
                          ? {
                              key: 'restore',
                              label: '恢复',
                              onClick: () => handleRestore(node),
                            }
                          : {
                              key: 'archive',
                              label: '归档',
                              onClick: () => confirmArchive(node),
                            },
                        {
                          key: 'delete',
                          danger: true,
                          label: '删除',
                          onClick: () => confirmDelete(node),
                        },
                      ],
                    }}
                  >
                    <Button type="link">更多</Button>
                  </Dropdown>,
                )
              }

              return (
                <List.Item actions={actions}>
                  <List.Item.Meta
                    title={
                      <Space>
                        <span className={styles.nodeIcon}>
                          <Icon name={isFolder ? 'folder' : 'file'} size={18} />
                        </span>
                        <span
                          className={styles.nodeTitle}
                          onClick={() =>
                            isFolder ? enterFolder(node) : openDocument(node)
                          }
                        >
                          {node.title || '未命名'}
                        </span>
                        <Tag>{docTypeLabel(node.docType)}</Tag>
                        {node.status !== 'normal' && (
                          <Tag color="orange">{statusLabel(node.status)}</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space separator={<span>·</span>} size={4}>
                        <Text type="secondary">{node.summary || '暂无摘要'}</Text>
                        <Text type="secondary">更新: {formatTime(node.updatedAt)}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Spin>

      <Modal
        title="新建文档"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        confirmLoading={submitting}
        destroyOnHidden
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ docType: 'rich_text' }}
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          <Form.Item label="类型" name="docType">
            <Select
              options={[
                { value: 'rich_text', label: '富文本文档' },
                { value: 'folder', label: '文件夹' },
              ]}
            />
          </Form.Item>
          <Form.Item label="摘要" name="summary">
            <Input.TextArea rows={3} placeholder="请输入文档摘要（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}