import {
  CloudUploadOutlined,
  FileAddOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Input, Select, Space, Tag, Typography } from 'antd'

import type { AuthUser } from '../../../../shared/types/auth'
import type { MockScenario } from '../../../../shared/types/document'
import { useHeaderPanel } from './hooks/useHeaderPanel'
import styles from './style/index.module.css'

interface HeaderPanelProps {
  user: AuthUser
  keyword: string
  stage: string
  stageOptions: readonly string[]
  mockMode: boolean
  mockRole: string
  mockScenarios: MockScenario[]
  loading: boolean
  onKeywordChange: (value: string) => void
  onStageChange: (value: string) => void
  onMockRoleChange: (value: string) => void
  onCreate: () => void
  onUpload: () => void
  onRefresh: () => void
  onLogout: () => void
}

function HeaderPanel({
  user,
  keyword,
  stage,
  stageOptions,
  mockMode,
  mockRole,
  mockScenarios,
  loading,
  onKeywordChange,
  onStageChange,
  onMockRoleChange,
  onCreate,
  onUpload,
  onRefresh,
  onLogout,
}: HeaderPanelProps) {
  const { scenarioOptions, selectOptions, subtitle, title } = useHeaderPanel(
    stageOptions,
    mockScenarios,
  )

  return (
    <section className={styles.section}>
      <div className={styles.meta}>
        <Typography.Title level={2} className={styles.title}>
          {title}
        </Typography.Title>
        <Typography.Paragraph className={styles.subtitle}>{subtitle}</Typography.Paragraph>
      </div>

      <div className={styles.controls}>
        <Space size={14} wrap>
          <Input
            allowClear
            value={keyword}
            prefix={<SearchOutlined />}
            placeholder="按标题、项目、负责人检索"
            className={styles.search}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
          <Select
            value={stage}
            options={selectOptions}
            className={styles.select}
            onChange={onStageChange}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
            刷新
          </Button>
          <Button type="primary" ghost icon={<FileAddOutlined />} onClick={onCreate}>
            新建文档
          </Button>
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={onUpload}>
            上传文档
          </Button>
        </Space>

        <div className={styles.userPanel}>
          <Avatar icon={<UserOutlined />} src={user.avatarUrl || undefined} />
          <div className={styles.userInfo}>
            <span className={styles.name}>{user.displayName || user.username}</span>
            <span className={styles.org}>{user.organization || '未设置组织信息'}</span>
          </div>
          {mockMode ? <Tag color="processing">Mock 模式</Tag> : null}
          {mockMode ? (
            <Select
              value={mockRole}
              options={scenarioOptions}
              className={styles.scenarioSelect}
              onChange={onMockRoleChange}
            />
          ) : null}
          <Button type="default" icon={<LogoutOutlined />} onClick={onLogout}>
            退出
          </Button>
        </div>
      </div>
    </section>
  )
}

export default HeaderPanel
