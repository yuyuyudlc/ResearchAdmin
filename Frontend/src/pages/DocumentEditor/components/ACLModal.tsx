import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Checkbox,
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
import { PERMISSION, userService } from '../../../services'
import type { ACLItem, User } from '../../../services'
import { useDocumentACL } from '../hooks/useDocumentACL'

const { Text } = Typography

interface ACLFormValues {
  subjectType: 'user' | 'workspace_member' | 'public'
  subjectId?: string
  permissions: number[]
  inherit: boolean
}

function combineBits(values: number[]): number {
  return values.reduce((acc, v) => acc | v, 0)
}

function splitBits(bit: number): number[] {
  const out: number[] = []
  if (bit & PERMISSION.READ) out.push(PERMISSION.READ)
  if (bit & PERMISSION.EDIT) out.push(PERMISSION.EDIT)
  if (bit & PERMISSION.MANAGE) out.push(PERMISSION.MANAGE)
  if (bit & PERMISSION.DENY) out.push(PERMISSION.DENY)
  return out
}

function bitLabel(bit: number): string {
  const tags: string[] = []
  if (bit & PERMISSION.READ) tags.push('读')
  if (bit & PERMISSION.EDIT) tags.push('编辑')
  if (bit & PERMISSION.MANAGE) tags.push('管理')
  if (bit & PERMISSION.DENY) tags.push('拒绝')
  return tags.join(' / ') || '-'
}

interface Props {
  open: boolean
  documentId: string | undefined
  onClose: () => void
}

export default function ACLModal({ open, documentId, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<ACLFormValues>()
  const [editing, setEditing] = useState<ACLItem | null>(null)
  const [searchedUsers, setSearchedUsers] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const { items, loading, submitting, refresh, createACL, updateACL, removeACL } =
    useDocumentACL(documentId)

  const handleUserSearch = async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchedUsers([])
      return
    }
    setSearchingUsers(true)
    try {
      const res = await userService.search(trimmed)
      setSearchedUsers(res.data)
    } catch (err) {
      console.error('Failed to search users:', err)
    } finally {
      setSearchingUsers(false)
    }
  }

  useEffect(() => {
    if (open) {
      refresh()
      form.resetFields()
      form.setFieldsValue({
        subjectType: 'user',
        permissions: [PERMISSION.READ],
        inherit: true,
      })
      setEditing(null)
      setSearchedUsers([])
    }
  }, [open, form, refresh])

  const openEdit = (item: ACLItem) => {
    setEditing(item)
    form.setFieldsValue({
      subjectType: item.subjectType as ACLFormValues['subjectType'],
      subjectId: item.subjectId || undefined,
      permissions: splitBits(item.permissionBit),
      inherit: item.inherit,
    })
  }

  const cancelEdit = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      subjectType: 'user',
      permissions: [PERMISSION.READ],
      inherit: true,
    })
    setSearchedUsers([])
  }

  const submit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateACL(editing.id, {
          permissionBit: combineBits(values.permissions),
          inherit: values.inherit,
        })
        message.success('权限已更新')
      } else {
        await createACL({
          subjectType: values.subjectType,
          subjectId: values.subjectType === 'public' ? null : values.subjectId?.trim() || null,
          permissionBit: combineBits(values.permissions),
          inherit: values.inherit,
        })
        message.success('权限已添加')
      }
      cancelEdit()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <Modal
      title="文档权限"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={720}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" requiredMark={false}>
          <Space wrap>
            <Form.Item name="subjectType" label="授权对象" style={{ minWidth: 160 }}>
              <Select
                disabled={!!editing}
                options={[
                  { value: 'user', label: '指定用户' },
                  { value: 'workspace_member', label: '工作区成员' },
                  { value: 'public', label: '所有人' },
                ]}
              />
            </Form.Item>
            <Form.Item
              shouldUpdate={(prev, cur) => prev.subjectType !== cur.subjectType}
              noStyle
            >
              {() => {
                const subjectType = form.getFieldValue('subjectType')
                if (subjectType === 'public') return null
                if (subjectType === 'user') {
                  const options = searchedUsers.map((u) => ({
                    value: u.id,
                    label: `${u.displayName} (${u.email})`,
                  }))
                  if (
                    editing &&
                    editing.subjectType === 'user' &&
                    editing.subjectId &&
                    !searchedUsers.some((u) => u.id === editing.subjectId)
                  ) {
                    options.push({
                      value: editing.subjectId,
                      label: `用户 ID: ${editing.subjectId}`,
                    })
                  }

                  return (
                    <Form.Item
                      name="subjectId"
                      label="选择用户"
                      style={{ minWidth: 280 }}
                      rules={[{ required: true, message: '请选择用户' }]}
                    >
                      <Select
                        showSearch
                        disabled={!!editing}
                        placeholder="输入用户名/邮箱/显示名搜索"
                        defaultActiveFirstOption={false}
                        filterOption={false}
                        onSearch={handleUserSearch}
                        notFoundContent={searchingUsers ? <Spin size="small" /> : '无匹配用户'}
                        options={options}
                      />
                    </Form.Item>
                  )
                }
                return (
                  <Form.Item
                    name="subjectId"
                    label="对象ID"
                    style={{ minWidth: 240 }}
                    rules={[{ required: true, message: '请输入对象ID' }]}
                  >
                    <Input disabled={!!editing} placeholder="用户/成员ID" />
                  </Form.Item>
                )
              }}
            </Form.Item>
            <Form.Item name="permissions" label="权限">
              <Checkbox.Group
                options={[
                  { value: PERMISSION.READ, label: '读' },
                  { value: PERMISSION.EDIT, label: '编辑' },
                  { value: PERMISSION.MANAGE, label: '管理' },
                  { value: PERMISSION.DENY, label: '拒绝' },
                ]}
              />
            </Form.Item>
            <Form.Item name="inherit" label="继承" valuePropName="checked">
              <Checkbox>子节点继承</Checkbox>
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" loading={submitting} onClick={submit}>
              {editing ? '保存修改' : '添加权限'}
            </Button>
            {editing && <Button onClick={cancelEdit}>取消编辑</Button>}
          </Space>
        </Form>

        <List
          style={{ marginTop: 16 }}
          dataSource={items}
          locale={{ emptyText: '暂无权限配置（默认继承父级）' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => openEdit(item)}>
                  编辑
                </Button>,
                <Button
                  type="link"
                  danger
                  onClick={() =>
                    removeACL(item.id).then(() => message.success('已删除'))
                  }
                >
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Tag>{item.subjectType}</Tag>
                    <Text strong>{item.subjectId || '所有人'}</Text>
                  </Space>
                }
                description={
                  <Space size={4} split={<span>·</span>}>
                    <Text type="secondary">权限: {bitLabel(item.permissionBit)}</Text>
                    <Text type="secondary">{item.inherit ? '继承' : '不继承'}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Spin>
    </Modal>
  )
}