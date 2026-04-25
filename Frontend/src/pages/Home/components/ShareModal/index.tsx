import { Form, Modal, Select } from 'antd'

import type { DocumentItem } from '../../../../shared/types/document'
import { useShareModal } from './hooks/useShareModal'
import styles from './style/index.module.css'

interface SharePermissionValues {
  target: string
  permission: '可编辑' | '只读'
}

interface ShareModalProps {
  open: boolean
  document: DocumentItem | null
  onCancel: () => void
  onSubmit: (values: SharePermissionValues) => void
}

function ShareModal({ open, document, onCancel, onSubmit }: ShareModalProps) {
  const [form] = Form.useForm<SharePermissionValues>()
  const { mockTargets } = useShareModal()

  return (
    <Modal
      open={open}
      title={document ? `共享设置 - ${document.title}` : '共享设置'}
      okText="保存"
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
        <Form.Item name="target" label="共享对象" rules={[{ required: true, message: '请选择对象' }]}>
          <Select showSearch options={mockTargets.map((item) => ({ value: item, label: item }))} />
        </Form.Item>
        <Form.Item name="permission" label="权限级别" rules={[{ required: true, message: '请选择权限' }]}>
          <Select
            options={[
              { value: '可编辑', label: '可编辑' },
              { value: '只读', label: '只读' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ShareModal
