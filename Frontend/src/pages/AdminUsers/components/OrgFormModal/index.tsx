import { useEffect, useState } from 'react'
import { Alert, Form, Input, InputNumber, Modal } from 'antd'
import type { Organization } from '../../../../services/types'

interface FormValues {
  name: string
  description?: string
  sortOrder?: number
}

interface Props {
  open: boolean
  /** null=新建；非 null=编辑 */
  org: Organization | null
  onCancel: () => void
  onCreate: (data: { name: string; description?: string }) => Promise<Organization>
  onUpdate: (orgId: string, data: { name?: string; description?: string; sortOrder?: number }) => Promise<Organization>
}

export default function OrgFormModal({ open, org, onCancel, onCreate, onUpdate }: Props) {
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (org) {
      form.setFieldsValue({
        name: org.name,
        description: org.description || '',
        sortOrder: org.sortOrder ?? 0,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ sortOrder: 0 })
    }
    setError('')
  }, [open, org, form])

  const handleOk = async () => {
    setError('')
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (org) {
        await onUpdate(org.id, {
          name: values.name.trim(),
          description: values.description?.trim() ?? '',
          sortOrder: typeof values.sortOrder === 'number' ? values.sortOrder : 0,
        })
      } else {
        await onCreate({
          name: values.name.trim(),
          description: values.description?.trim() ?? '',
        })
      }
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
      title={org ? `编辑机构：${org.name}` : '新建机构'}
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
          label="机构名称"
          name="name"
          rules={[
            { required: true, message: '请输入机构名称' },
            { max: 128, message: '不超过 128 字' },
          ]}
        >
          <Input placeholder="例如：清华大学计算机系" autoComplete="off" />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={500} showCount />
        </Form.Item>
        {org && (
          <Form.Item label="排序" name="sortOrder" tooltip="数字越小越靠前">
            <InputNumber min={0} max={9999} style={{ width: 160 }} />
          </Form.Item>
        )}
        {error && <Alert type="error" message={error} showIcon />}
      </Form>
    </Modal>
  )
}