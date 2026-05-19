import { useEffect, useState } from 'react'
import { Alert, Form, Modal, Select } from 'antd'
import type { Organization, User } from '../../../../services/types'

const UNASSIGNED_VALUE = '__unassigned__'

interface FormValues {
  organizationId: string
}

interface Props {
  open: boolean
  user: User | null
  organizations: Organization[]
  onCancel: () => void
  onSubmit: (userId: string, organizationId: string | null) => Promise<void>
}

export default function MoveUserModal({
  open,
  user,
  organizations,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        organizationId: user.organizationId || UNASSIGNED_VALUE,
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
      const orgId = values.organizationId === UNASSIGNED_VALUE ? null : values.organizationId
      await onSubmit(user.id, orgId)
      onCancel()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      setError(err instanceof Error ? err.message : '移动失败')
    } finally {
      setSubmitting(false)
    }
  }

  const options = [
    { label: '未分配', value: UNASSIGNED_VALUE },
    ...organizations.map((o) => ({ label: o.name, value: o.id })),
  ]

  return (
    <Modal
      title={user ? `移动用户：${user.username}` : '移动用户'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="移动"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} disabled={submitting}>
        <Form.Item
          label="目标机构"
          name="organizationId"
          rules={[{ required: true, message: '请选择目标机构' }]}
        >
          <Select showSearch placeholder="选择目标机构" options={options} filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          } />
        </Form.Item>
        {error && <Alert type="error" message={error} showIcon />}
      </Form>
    </Modal>
  )
}