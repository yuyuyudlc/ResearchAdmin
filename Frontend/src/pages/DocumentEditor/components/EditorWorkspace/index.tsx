import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'

import type { DocumentItem } from '../../../../shared/types/document'
import type { DocumentEditValues, ShareEntry } from '../../hooks/useDocumentEditor'
import { useEditorWorkspace } from './hooks/useEditorWorkspace'
import styles from './style/index.module.css'

interface HistoryRow {
  id: string
  versionNo: number
  summary: string
  operator: string
  createdAt: string
}

interface EditorWorkspaceProps {
  loading: boolean
  document: DocumentItem | null
  status: DocumentItem['status']
  historyRows: HistoryRow[]
  shareList: ShareEntry[]
  shareTarget: string
  sharePermission: '可编辑' | '只读'
  onShareTargetChange: (value: string) => void
  onSharePermissionChange: (value: '可编辑' | '只读') => void
  onSave: (values: DocumentEditValues) => void
  onChangeStatus: (value: DocumentItem['status']) => void
  onAddShare: () => void
  onRemoveShare: (id: number) => void
  onBack: () => void
}

function EditorWorkspace({
  loading,
  document,
  status,
  historyRows,
  shareList,
  shareTarget,
  sharePermission,
  onShareTargetChange,
  onSharePermissionChange,
  onSave,
  onChangeStatus,
  onAddShare,
  onRemoveShare,
  onBack,
}: EditorWorkspaceProps) {
  const [form] = Form.useForm<DocumentEditValues>()
  const { initialValues, stageOptions, statusOptions } = useEditorWorkspace(document)

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.head}>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回主页
          </Button>
          <Typography.Title level={3} className={styles.title}>
            文档管理编辑页
          </Typography.Title>
          <Tag color="processing">Mock 工作流</Tag>
        </div>

        <Spin spinning={loading}>
          {!document ? (
            <Card>未找到文档</Card>
          ) : (
            <Row gutter={[14, 14]}>
              <Col xs={24} lg={16}>
                <Card
                  title="文档信息编辑"
                  extra={
                    <Space>
                      <Select
                        value={status}
                        style={{ width: 132 }}
                        options={statusOptions.map((item) => ({ value: item, label: item }))}
                        onChange={(value) => onChangeStatus(value as DocumentItem['status'])}
                      />
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => {
                          void form
                            .validateFields()
                            .then((values) => onSave(values))
                            .catch(() => undefined)
                        }}
                      >
                        保存变更
                      </Button>
                    </Space>
                  }
                >
                  <Form
                    key={document.id}
                    form={form}
                    layout="vertical"
                    initialValues={initialValues}
                  >
                    <Form.Item name="title" label="文档标题" rules={[{ required: true, message: '请输入文档标题' }]}>
                      <Input />
                    </Form.Item>
                    <Row gutter={[10, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="projectName"
                          label="所属项目"
                          rules={[{ required: true, message: '请输入项目名称' }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="stage"
                          label="研究阶段"
                          rules={[{ required: true, message: '请选择阶段' }]}
                        >
                          <Select options={stageOptions.map((item) => ({ value: item, label: item }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="tags" label="标签">
                      <Select mode="tags" tokenSeparators={[',']} />
                    </Form.Item>
                    <Form.Item name="summary" label="摘要">
                      <Input.TextArea rows={4} />
                    </Form.Item>
                  </Form>
                </Card>

                <Card title="历史记录" className={styles.card}>
                  <Table<HistoryRow>
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={historyRows}
                    columns={[
                      { title: '版本', dataIndex: 'versionNo', key: 'versionNo', width: 80, render: (value) => `v${value}` },
                      { title: '说明', dataIndex: 'summary', key: 'summary' },
                      { title: '操作人', dataIndex: 'operator', key: 'operator', width: 110 },
                      { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
                    ]}
                  />
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card title="共享设置">
                  <Space.Compact className={styles.shareInput}>
                    <Input
                      value={shareTarget}
                      placeholder="输入用户或用户组"
                      onChange={(event) => onShareTargetChange(event.target.value)}
                    />
                    <Select
                      value={sharePermission}
                      style={{ width: 110 }}
                      options={[
                        { value: '可编辑', label: '可编辑' },
                        { value: '只读', label: '只读' },
                      ]}
                      onChange={(value) => onSharePermissionChange(value as '可编辑' | '只读')}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={onAddShare}>
                      添加
                    </Button>
                  </Space.Compact>

                  <List
                    className={styles.shareList}
                    dataSource={shareList}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button
                            key={`remove-${item.id}`}
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onRemoveShare(item.id)}
                          >
                            移除
                          </Button>,
                        ]}
                      >
                        <Space>
                          <Typography.Text>{item.target}</Typography.Text>
                          <Tag color={item.permission === '可编辑' ? 'processing' : 'default'}>
                            {item.permission}
                          </Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>

                <Card title="文档状态说明" className={styles.card}>
                  <ul className={styles.tips}>
                    <li>进行中：允许持续编辑与评论协作。</li>
                    <li>待审核：限制变更，等待负责人确认。</li>
                    <li>已归档：默认只读，保留历史追溯能力。</li>
                  </ul>
                </Card>
              </Col>
            </Row>
          )}
        </Spin>
      </section>
    </main>
  )
}

export default EditorWorkspace
