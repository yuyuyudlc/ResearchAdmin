import { InboxOutlined } from '@ant-design/icons'
import { Form, Input, Modal, Select, Upload } from 'antd'

import type { UploadDocumentValues } from '../../hooks/useHome'
import { useUploadDocumentModal } from './hooks/useUploadDocumentModal'
import styles from './style/index.module.css'

interface UploadDocumentModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (values: UploadDocumentValues) => void
}

function UploadDocumentModal({ open, onCancel, onSubmit }: UploadDocumentModalProps) {
  const [form] = Form.useForm<UploadDocumentValues>()
  const { beforeUpload, stageOptions } = useUploadDocumentModal()

  return (
    <Modal
      open={open}
      title="上传文档"
      okText="上传"
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
        <Form.Item name="fileName" label="文件名" rules={[{ required: true, message: '请输入文件名' }]}>
          <Input placeholder="例如：实验数据说明.pdf" />
        </Form.Item>
        <Upload.Dragger className={styles.upload} multiple={false} beforeUpload={beforeUpload} showUploadList={false}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p>拖拽文件到这里，或点击选择文件</p>
        </Upload.Dragger>
        <Form.Item name="title" label="文档标题" rules={[{ required: true, message: '请输入文档标题' }]}>
          <Input placeholder="例如：4 月实验原始数据" />
        </Form.Item>
        <Form.Item name="projectName" label="所属项目" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="例如：智能材料研究" />
        </Form.Item>
        <Form.Item name="stage" label="研究阶段" rules={[{ required: true, message: '请选择阶段' }]}>
          <Select options={stageOptions.map((item) => ({ value: item, label: item }))} />
        </Form.Item>
        <Form.Item name="tags" label="标签">
          <Select mode="tags" tokenSeparators={[',']} />
        </Form.Item>
        <Form.Item name="summary" label="摘要">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UploadDocumentModal
