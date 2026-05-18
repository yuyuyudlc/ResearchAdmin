import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App,
  Alert,
  Button,
  Card,
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
} from 'antd'
import type { Workspace } from '../../services/types'
import {
  useWorkspaceList,
  type MemberFormValues,
  type WorkspaceFormValues,
} from './hooks/useWorkspaceList'
import styles from './style/index.module.css'

const { Paragraph, Text, Title } = Typography

function formatTime(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

function roleLabel(role?: string): string {
  return role === 'owner' ? '拥有者' : '成员'
}

export default function WorkspaceListPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm<WorkspaceFormValues>()
  const [memberForm] = Form.useForm<MemberFormValues>()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Workspace | null>(null)
  const [memberTarget, setMemberTarget] = useState<Workspace | null>(null)

  const {
    workspaces,
    loading,
    submitting,
    members,
    membersLoading,
    error,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchMembers,
    addMember,
    removeMember,
  } = useWorkspaceList()

  const openCreate = () => {
    form.resetFields()
    setCreateOpen(true)
  }

  const openEdit = (workspace: Workspace) => {
    form.setFieldsValue({
      name: workspace.name,
      description: workspace.description,
    })
    setEditTarget(workspace)
  }

  const openMembers = async (workspace: Workspace) => {
    setMemberTarget(workspace)
    memberForm.resetFields()
    await fetchMembers(workspace.id)
  }

  const submitWorkspace = async () => {
    const values = await form.validateFields()
    try {
      if (editTarget) {
        await updateWorkspace(editTarget.id, values)
        setEditTarget(null)
        message.success('工作区已更新')
      } else {
        await createWorkspace(values)
        setCreateOpen(false)
        message.success('工作区已创建')
      }
      form.resetFields()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  const confirmDelete = (workspace: Workspace) => {
    Modal.confirm({
      title: '删除工作区',
      content: `确定要删除工作区「${workspace.name}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteWorkspace(workspace.id)
        message.success('工作区已删除')
      },
    })
  }

  const submitMember = async () => {
    if (!memberTarget) return
    const values = await memberForm.validateFields()
    try {
      await addMember(memberTarget.id, values)
      memberForm.resetFields()
      message.success('成员已添加')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '添加成员失败')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>
            工作区
          </Title>
          <Text type="secondary">管理工作区信息、成员和空间级设置。</Text>
        </div>
        <Space>
          <Button onClick={fetchWorkspaces}>刷新</Button>
          <Button type="primary" onClick={openCreate}>
            新建工作区
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          className={styles.alert}
          type="error"
          message={error}
          showIcon
          action={<Button onClick={fetchWorkspaces}>重试</Button>}
        />
      )}

      <Spin spinning={loading}>
        {workspaces.length === 0 && !loading ? (
          <Empty description="暂无工作区">
            <Button type="primary" onClick={openCreate}>
              新建工作区
            </Button>
          </Empty>
        ) : (
          <div className={styles.grid}>
            {workspaces.map((workspace) => (
              <Card
                key={workspace.id}
                className={styles.card}
                title={
                  <Space>
                    <span className={styles.avatar}>
                      {workspace.name.slice(0, 1).toUpperCase()}
                    </span>
                    <a onClick={() => navigate(`/workspaces/${workspace.id}`)}>
                      {workspace.name}
                    </a>
                  </Space>
                }
                extra={<Tag>{roleLabel(workspace.role)}</Tag>}
                actions={[
                  <Button
                    type="link"
                    onClick={() => navigate(`/workspaces/${workspace.id}`)}
                  >
                    进入
                  </Button>,
                  <Button type="link" onClick={() => openMembers(workspace)}>
                    成员
                  </Button>,
                  workspace.role === 'owner' ? (
                    <Button type="link" onClick={() => openEdit(workspace)}>
                      编辑
                    </Button>
                  ) : (
                    <Text type="secondary">只读</Text>
                  ),
                  workspace.role === 'owner' ? (
                    <Button danger type="link" onClick={() => confirmDelete(workspace)}>
                      删除
                    </Button>
                  ) : (
                    <Text type="secondary">-</Text>
                  ),
                ]}
              >
                <Paragraph className={styles.description} type="secondary">
                  {workspace.description || '暂无描述'}
                </Paragraph>
                <div className={styles.meta}>
                  <Text type="secondary">所有者: {workspace.ownerUserId || '-'}</Text>
                  <Text type="secondary">更新: {formatTime(workspace.updatedAt)}</Text>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Spin>

      <Modal
        title={editTarget ? '编辑工作区' : '新建工作区'}
        open={createOpen || !!editTarget}
        onCancel={() => {
          setCreateOpen(false)
          setEditTarget(null)
        }}
        onOk={submitWorkspace}
        confirmLoading={submitting}
        destroyOnHidden
        okText={editTarget ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入工作区名称' }]}
          >
            <Input placeholder="请输入工作区名称" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={4} placeholder="请输入工作区描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={memberTarget ? `成员管理：${memberTarget.name}` : '成员管理'}
        open={!!memberTarget}
        onCancel={() => setMemberTarget(null)}
        footer={<Button onClick={() => setMemberTarget(null)}>关闭</Button>}
        width={640}
        destroyOnHidden
      >
        {memberTarget?.role === 'owner' && (
          <Form
            form={memberForm}
            layout="inline"
            className={styles.memberForm}
            initialValues={{ role: 'member' }}
          >
            <Form.Item
              name="userId"
              rules={[{ required: true, message: '请输入用户ID' }]}
            >
              <Input placeholder="用户ID" />
            </Form.Item>
            <Form.Item name="role">
              <Select
                className={styles.roleSelect}
                options={[
                  { value: 'member', label: '成员' },
                  { value: 'owner', label: '拥有者' },
                ]}
              />
            </Form.Item>
            <Button type="primary" onClick={submitMember}>
              添加
            </Button>
          </Form>
        )}

        <List
          loading={membersLoading}
          dataSource={members}
          locale={{ emptyText: '暂无成员' }}
          renderItem={(member) => (
            <List.Item
              actions={
                memberTarget?.role === 'owner' && member.role !== 'owner'
                  ? [
                      <Button
                        danger
                        type="link"
                        onClick={() =>
                          memberTarget &&
                          removeMember(memberTarget.id, member.userId).then(() =>
                            message.success('成员已移除'),
                          )
                        }
                      >
                        移除
                      </Button>,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                title={member.userId}
                description={roleLabel(member.role)}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  )
}
