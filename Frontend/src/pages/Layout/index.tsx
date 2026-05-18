import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  App,
  Avatar,
  Button,
  Descriptions,
  Dropdown,
  Empty,
  Form,
  Input,
  Layout as AntLayout,
  List,
  Modal,
  Space,
  Spin,
  Tabs,
  Typography,
} from 'antd'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth'
import { searchService } from '../../services/search'
import type { DocumentNode } from '../../services/types'
import Sidebar from '../../components/Sidebar'
import Icon from '../../components/Icon'
import styles from './style/index.module.css'

const { Header, Sider, Content } = AntLayout
const { Text, Title } = Typography

interface ProfileFormValues {
  username: string
  email: string
  organization: string
  avatar_url: string
  signature: string
  professional_title: string
  supervisor: string
}

interface PasswordFormValues {
  old_password: string
  new_password: string
  confirm_password: string
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/documents')) return '文档'
  if (pathname.startsWith('/workspaces')) return '团队空间'
  if (pathname === '/' || pathname === '') return '首页'
  return '科研云文档'
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const { user, loading: authLoading, logout, updateUser } = useAuth()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<DocumentNode[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm] = Form.useForm<ProfileFormValues>()
  const [passwordForm] = Form.useForm<PasswordFormValues>()
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!searchOpen || !searchText.trim()) {
      setSearchResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchService.documents({ q: searchText.trim() })
        setSearchResults(res.data.items)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchOpen, searchText])

  useEffect(() => {
    if (profileOpen && user) {
      profileForm.setFieldsValue({
        username: user.username || '',
        email: user.email || '',
        organization: user.organization || '',
        avatar_url: user.avatarUrl || '',
        signature: user.signature || '',
        professional_title: user.professionalTitle || '',
        supervisor: user.supervisor || '',
      })
      passwordForm.resetFields()
    }
  }, [profileOpen, user, profileForm, passwordForm])

  if (authLoading) {
    return (
      <div className={styles.fullscreen}>
        <Spin />
      </div>
    )
  }

  if (!user) return null

  const displayName = user.displayName || user.username || '用户'

  const submitProfile = async () => {
    const values = await profileForm.validateFields()
    setProfileSubmitting(true)
    try {
      await authService.updateProfile(values)
      updateUser({
        username: values.username,
        email: values.email,
        organization: values.organization,
        avatarUrl: values.avatar_url,
        signature: values.signature,
        professionalTitle: values.professional_title,
        supervisor: values.supervisor,
        displayName: values.username,
      })
      message.success('个人信息已更新')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '更新失败')
    } finally {
      setProfileSubmitting(false)
    }
  }

  const submitPassword = async () => {
    const values = await passwordForm.validateFields()
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的新密码不一致')
      return
    }
    setPasswordSubmitting(true)
    try {
      await authService.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      })
      passwordForm.resetFields()
      message.success('密码已更新，请妥善保管')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '密码修改失败')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  return (
    <AntLayout className={styles.layout}>
      <Sider width={272} theme="light" className={styles.sider}>
        <div className={styles.brand} onClick={() => navigate('/')}>
          <div className={styles.logo}>R</div>
          <div>
            <Text strong>科研云文档</Text>
            <div className={styles.brandSub}>Research Admin</div>
          </div>
        </div>

        <Button
          block
          className={styles.searchButton}
          icon={<Icon name="search" size={14} />}
          onClick={() => setSearchOpen(true)}
        >
          搜索文档
        </Button>

        <div className={styles.sidebarWrap}>
          <Sidebar />
        </div>
      </Sider>

      <AntLayout>
        <Header className={styles.header}>
          <Title level={4} className={styles.headerTitle}>
            {getPageTitle(location.pathname)}
          </Title>
          <Dropdown
            menu={{
              items: [
                { key: 'profile', label: '个人信息' },
                { key: 'logout', danger: true, label: '退出登录' },
              ],
              onClick: ({ key }) => {
                if (key === 'logout') {
                  logout()
                  navigate('/login')
                } else if (key === 'profile') {
                  setProfileOpen(true)
                }
              },
            }}
          >
            <Space className={styles.user}>
              <Avatar src={user.avatarUrl || undefined}>
                {displayName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Text>{displayName}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content className={styles.content}>
          <Outlet />
        </Content>
      </AntLayout>

      <Modal
        title="个人信息"
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        footer={<Button onClick={() => setProfileOpen(false)}>关闭</Button>}
        width={640}
        destroyOnHidden
      >
        <Space align="start" style={{ marginBottom: 16 }}>
          <Avatar size={64} src={user.avatarUrl || undefined}>
            {displayName.slice(0, 1).toUpperCase()}
          </Avatar>
          <div>
            <Title level={5} style={{ margin: 0 }}>{displayName}</Title>
            <Text type="secondary">{user.signature || '暂无签名'}</Text>
          </div>
        </Space>
        <Tabs
          items={[
            {
              key: 'view',
              label: '基本信息',
              children: (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="用户ID">{user.id}</Descriptions.Item>
                  <Descriptions.Item label="用户名">{user.username || '-'}</Descriptions.Item>
                  <Descriptions.Item label="邮箱">{user.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="所属机构">{user.organization || '-'}</Descriptions.Item>
                  <Descriptions.Item label="职称">{user.professionalTitle || '-'}</Descriptions.Item>
                  <Descriptions.Item label="导师">{user.supervisor || '-'}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'edit',
              label: '编辑资料',
              children: (
                <Form form={profileForm} layout="vertical" requiredMark={false}>
                  <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="所属机构" name="organization">
                    <Input />
                  </Form.Item>
                  <Form.Item label="头像地址" name="avatar_url">
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item label="个性签名" name="signature">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="职称" name="professional_title">
                    <Input />
                  </Form.Item>
                  <Form.Item label="导师" name="supervisor">
                    <Input />
                  </Form.Item>
                  <Button type="primary" loading={profileSubmitting} onClick={submitProfile}>
                    保存
                  </Button>
                </Form>
              ),
            },
            {
              key: 'password',
              label: '修改密码',
              children: (
                <Form form={passwordForm} layout="vertical" requiredMark={false}>
                  <Form.Item label="旧密码" name="old_password" rules={[{ required: true, message: '请输入旧密码' }]}>
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    label="新密码"
                    name="new_password"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码至少 6 位' },
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item label="确认新密码" name="confirm_password" rules={[{ required: true, message: '请再次输入新密码' }]}>
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" loading={passwordSubmitting} onClick={submitPassword}>
                    修改密码
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title="搜索文档"
        open={searchOpen}
        onCancel={() => {
          setSearchOpen(false)
          setSearchText('')
        }}
        footer={null}
        destroyOnHidden
      >
        <Input
          placeholder="输入标题或关键词"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          autoFocus
        />
        <List
          className={styles.searchResults}
          loading={searching}
          dataSource={searchResults}
          locale={{
            emptyText: searchText.trim() ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到文档" />
            ) : (
              '输入关键词搜索'
            ),
          }}
          renderItem={(doc) => (
            <List.Item
              className={styles.searchItem}
              onClick={() => {
                navigate(`/documents/${doc.id}`)
                setSearchOpen(false)
                setSearchText('')
              }}
            >
              <List.Item.Meta
                title={doc.title}
                description={doc.summary || doc.workspaceId}
              />
            </List.Item>
          )}
        />
      </Modal>
    </AntLayout>
  )
}