import { useEffect, useState } from 'react'
import { Alert, Form, Modal, Select, Typography } from 'antd'
import type { Organization } from '../../../../services/types'

const { Paragraph, Text } = Typography
const UNASSIGNED_VALUE = '__unassigned__'

interface Props {
  open: boolean
  org: Organization | null
  organizations: Organization[]
  onCancel: () => void
  onSubmit: (orgId: string, targetOrgId?: string) => Promise<void>
}

export default function DeleteOrgModal({ open, org, organizations, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<{ targetOrgId: string }>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasMembers = (org?.userCount ?? 0) > 0

  useEffect(() => {
    if (open) {
      form.resetFields()
      setError('')
    }
  }, [open, form])

  const handleOk = async () => {
    if (!org) return
    setError('')
    try {
      let targetOrgId: string | undefined
      if (hasMembers) {
        const values = await form.validateFields()
        targetOrgId = values.targetOrgId === UNASSIGNED_VALUE ? 'unassigned' : values.targetOrgId
      }
      setSubmitting(true)
      await onSubmit(org.id, targetOrgId)
      onCancel()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setSubmitting(false)
    }
  }

  const targetOptions = [
    { label: '未分配', value: UNASSIGNED_VALUE },
    ...organizations
      .filter((o) => o.id !== org?.id)
      .map((o) => ({ label: o.name, value: o.id })),
  ]

  return (
    <Modal
      title={org ? `删除机构：${org.name}` : '删除机构'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="删除"
      okButtonProps={{ danger: true }}
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnHidden
    >
      {hasMembers ? (
        <>
          <Alert
            type="warning"
            showIcon
            message={`该机构下仍有 ${org?.userCount} 名成员，请选择目标机构以完成搬迁。`}
            style={{ marginBottom: 16 }}
          />
          <Form form={form} layout="vertical" requiredMark={false} disabled={submitting}>
            <Form.Item
              label="将成员搬迁到"
              name="targetOrgId"
              rules={[{ required: true, message: '请选择目标机构' }]}
            >
              <Select showSearch placeholder="选择目标" options={targetOptions} filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              } />
            </Form.Item>
          </Form>
        </>
      ) : (
        <Paragraph>
          确定删除机构 <Text strong>{org?.name}</Text> 吗？该机构当前无成员，删除后不可恢复。
        </Paragraph>
      )}
      {error && <Alert type="error" message={error} showIcon />}
    </Modal>
  )
}