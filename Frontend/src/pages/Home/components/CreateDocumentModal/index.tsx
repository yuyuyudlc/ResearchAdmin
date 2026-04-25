import { Form, Input, Modal, Select } from 'antd'

import type { CreateDocumentValues } from '../../hooks/useHome'
import { useCreateDocumentModal } from './hooks/useCreateDocumentModal'
import styles from './style/index.module.css'

interface CreateDocumentModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (values: CreateDocumentValues) => void
}

function CreateDocumentModal({ open, onCancel, onSubmit }: CreateDocumentModalProps) {
  const [form] = Form.useForm<CreateDocumentValues>()
  const { stageOptions } = useCreateDocumentModal()

  return (
    <Modal
      open={open}
      title="新建文档"
      okText="创建"
      cancelText="取消"
      onCancel={() => {
        form.resetFields()
        onCancel()
      }}
      onOk={() => {
        void form
          .validateFields()
          .then((values) => {
            onSubmit(values)
            form.resetFields()
          })
          .catch(() => undefined)
      }}
    >
      <Form form={form} layout="vertical" className={styles.form}>
        <Form.Item name="title" label="文档标题" rules={[{ required: true, message: '请输入文档标题' }]}>
          <Input placeholder="例如：实验记录草稿" />
        </Form.Item>
        <Form.Item name="projectName" label="所属项目" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="例如：智能材料研究" />
        </Form.Item>
        <Form.Item name="stage" label="研究阶段" rules={[{ required: true, message: '请选择阶段' }]}>
          <Select options={stageOptions.map((item) => ({ value: item, label: item }))} />
        </Form.Item>
        <Form.Item name="tags" label="标签">
          <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车，例如：实验,阶段一" />
        </Form.Item>
        <Form.Item name="summary" label="摘要">
          <Input.TextArea rows={3} placeholder="简要说明文档内容与用途" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CreateDocumentModal
