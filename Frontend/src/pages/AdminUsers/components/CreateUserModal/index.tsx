import { useEffect, useState } from 'react'
import { Alert, Form, Input, Modal, Select, Typography } from 'antd'
import type {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  Organization,
} from '../../../../services/types'

const { Text, Paragraph } = Typography

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

const UNASSIGNED_VALUE = '__unassigned__'

interface FormValues {
  username: string
  email: string
  organizationId: string
  professionalTitle?: string
  supervisor?: string
}

interface Props {
  open: boolean
  organizations: Organization[]
  /** 当前选中机构 id；'__unassigned__' 表示未分配 */
  defaultOrgValue: string
  onCancel: () => void
  onSubmit: (payload: AdminCreateUserRequest) => Promise<AdminCreateUserResponse>
}

export default function CreateUserModal({
  open,
  organizations,
  defaultOrgValue,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({ organizationId: defaultOrgValue || UNASSIGNED_VALUE })
      setError('')
    }
  }, [open, defaultOrgValue, form])

  const orgOptions = [
    { label: '未分配', value: UNASSIGNED_VALUE },
    ...organizations.map((o) => ({ label: o.name, value: o.id })),
  ]

  const handleOk = async () => {
    setError('')
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload: AdminCreateUserRequest = {
        username: values.username.trim(),
        email: values.email.trim(),
        organizationId:
          values.organizationId === UNASSIGNED_VALUE ? null : values.organizationId,
        professionalTitle: values.professionalTitle || '',
        supervisor: values.supervisor?.trim() || '',
      }
      const data = await onSubmit(payload)
      Modal.success({
        title: '账号已创建',
        content: (
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              请将以下账号信息告知本人，建议本人首次登录后立即修改密码。
            </Paragraph>
            <Paragraph style={{ marginBottom: 4 }}>
              <Text strong>用户名：</Text>
              <Text copyable>{data.user.username}</Text>
            </Paragraph>
            <Paragraph style={{ marginBottom: 4 }}>
              <Text strong>邮箱：</Text>
              <Text copyable>{data.user.email}</Text>
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              <Text strong>初始密码：</Text>
              <Text copyable code>{data.initialPassword}</Text>
            </Paragraph>
          </div>
        ),
      })
      onCancel()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="创建账号"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="创建"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        message="账号将使用默认初始密码（Research@123），请通知本人首次登录后立即修改。"
        style={{ marginBottom: 16 }}
      />
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} disabled={submitting}>
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 2, max: 32, message: '用户名长度 2-32' },
          ]}
        >
          <Input placeholder="例如：zhangsan" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input placeholder="用作登录账号" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="所属机构"
          name="organizationId"
          rules={[{ required: true, message: '请选择机构' }]}
        >
          <Select
            showSearch
            placeholder="选择机构"
            options={orgOptions}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item label="职称 / 身份" name="professionalTitle">
          <Select allowClear placeholder="选填" options={PROFESSIONAL_TITLE_OPTIONS} />
        </Form.Item>
        <Form.Item label="导师" name="supervisor">
          <Input placeholder="选填" />
        </Form.Item>

        {error && <Alert type="error" message={error} showIcon />}
      </Form>
    </Modal>
  )
}