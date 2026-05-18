import { useEffect, useState } from 'react'
import { Form, Input, Modal, Select } from 'antd'

export type CreateContext =
  | { scope: 'private'; parentId: string | null }
  | { scope: 'team'; workspaceId: string; parentId: string | null }

export interface CreateValues {
  title: string
  docType: string
  summary?: string
}

interface Props {
  ctx: CreateContext | null
  onCancel: () => void
  onSubmit: (values: CreateValues) => Promise<void> | void
}

export default function CreateDocModal({ ctx, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<CreateValues>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ctx) {
      form.resetFields()
      form.setFieldsValue({ docType: 'rich_text' })
    }
  }, [ctx, form])

  const submit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setSubmitting(false)
    }
  }

  const title = (() => {
    if (!ctx) return '新建文档'
    if (ctx.parentId) return '新建子文档'
    if (ctx.scope === 'private') return '在私人空间新建文档'
    return '在团队空间新建文档'
  })()

  return (
    <Modal
      title={title}
      open={!!ctx}
      onCancel={onCancel}
      onOk={submit}
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
          <Input placeholder="请输入文档标题" autoFocus />
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
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  )
}