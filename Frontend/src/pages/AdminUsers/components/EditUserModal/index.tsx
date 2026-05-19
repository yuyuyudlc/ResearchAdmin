import { useEffect, useState } from 'react'
import { Alert, Form, Input, Modal, Select } from 'antd'
import type { AdminUpdateUserRequest, User } from '../../../../services/types'

const PROFESSIONAL_TITLE_OPTIONS = [
  { label: '教授', value: 'professor' },
  { label: '副教授', value: 'associate_professor' },
  { label: '讲师', value: 'lecturer' },
  { label: '研究员', value: 'researcher' },
  { label: '工程师', value: 'engineer' },
  { label: '博士生', value: 'doctoral_student' },
  { label: '硕士生', value: 'master_student' },
  { label: '其他', value: 'other' },
]

interface FormValues {
  username: string
  email: string
  professionalTitle?: string
  supervisor?: string
  signature?: string
  avatarUrl?: string
}

interface Props {
  open: boolean
  user: User | null
  onCancel: () => void
  onSubmit: (userId: string, data: AdminUpdateUserRequest) => Promise<User>
}

export default function EditUserModal({ open, user, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        username: user.username || '',
        email: user.email || '',
        professionalTitle: user.professionalTitle || '',
        supervisor: user.supervisor || '',
        signature: user.signature || '',
        avatarUrl: user.avatarUrl || '',
      })
      setError('')
    }
  }, [open, user, form])

  const handleOk = async () => {
    if (!user) return
    setError('')
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await onSubmit(user.id, {
        username: values.username.trim(),
        email: values.email.trim(),
        professionalTitle: values.professionalTitle ?? '',
        supervisor: values.supervisor?.trim() ?? '',
        signature: values.signature?.trim() ?? '',
        avatarUrl: values.avatarUrl?.trim() ?? '',
      })
      onCancel()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={user ? `编辑用户：${user.username}` : '编辑用户'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} disabled={submitting}>
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 2, max: 32, message: '用户名长度 2-32' },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label="职称 / 身份" name="professionalTitle">
          <Select allowClear placeholder="选填" options={PROFESSIONAL_TITLE_OPTIONS} />
        </Form.Item>
        <Form.Item label="导师" name="supervisor">
          <Input placeholder="选填" />
        </Form.Item>
        <Form.Item label="签名" name="signature">
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={200}
            showCount
          />
        </Form.Item>
        <Form.Item label="头像地址" name="avatarUrl">
          <Input placeholder="https://..." />
        </Form.Item>

        {error && <Alert type="error" message={error} showIcon />}
      </Form>
    </Modal>
  )
}