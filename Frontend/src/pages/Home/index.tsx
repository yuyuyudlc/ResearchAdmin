import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Empty,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { workspaceService } from '../../services/workspace'
import { documentService } from '../../services/document'
import type { Workspace, HomeDocumentItem } from '../../services/types'
import Icon, { type IconName } from '../../components/Icon'
import styles from './style.module.css'

const { Title, Text } = Typography

interface FeedItem {
  id: string
  title: string
  type: string
  time: string
  tag?: string
}

const DOC_TYPE_CONFIG: Record<string, { icon: IconName; color: string; label: string }> = {
  rich_text: { icon: 'file', color: '#1677ff', label: '富文本' },
  sheet: { icon: 'file', color: '#52c41a', label: '电子表格' },
  folder: { icon: 'folder', color: '#faad14', label: '文件夹' },
  file: { icon: 'file', color: '#1677ff', label: '文件' },
  doc: { icon: 'file', color: '#1677ff', label: '文档' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 0) return iso
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

type TabKey = 'recent' | 'mine' | 'favorite'

const SCOPE_BY_TAB: Record<TabKey, string> = {
  recent: 'recent',
  mine: 'mine',
  favorite: 'favorite',
}

const TIME_LABEL: Record<TabKey, string> = {
  recent: '最近访问',
  mine: '创建时间',
  favorite: '收藏时间',
}

export default function HomePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('recent')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [wsLoading, setWsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [docItems, setDocItems] = useState<HomeDocumentItem[]>([])

  useEffect(() => {
    setWsLoading(true)
    workspaceService
      .list()
      .then((res) => setWorkspaces(res.data.items ?? []))
      .catch(() => setWorkspaces([]))
      .finally(() => setWsLoading(false))
  }, [])

  const fetchDocuments = useCallback(async (scope: string) => {
    setLoading(true)
    try {
      const res = await documentService.listHomeDocuments(scope)
      setDocItems(res.data.items ?? [])
    } catch {
      setDocItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments(SCOPE_BY_TAB[tab])
  }, [tab, fetchDocuments])

  const dataSource = useMemo<FeedItem[]>(() => {
    return docItems.map((item) => {
      const docType = item.docType || 'doc'
      const config = DOC_TYPE_CONFIG[docType] ?? DOC_TYPE_CONFIG.doc
      const timeField = tab === 'recent' ? item.openedAt : tab === 'favorite' ? item.favoritedAt : item.createdAt
      return {
        id: item.id,
        title: item.title,
        type: docType,
        time: timeField ? formatTime(timeField) : '未知',
        tag: config.label,
      }
    })
  }, [tab, docItems])

  const columns: ColumnsType<FeedItem> = [
    {
      title: '文档名称',
      dataIndex: 'title',
      key: 'title',
      render: (_: unknown, record: FeedItem) => {
        const config = DOC_TYPE_CONFIG[record.type] ?? DOC_TYPE_CONFIG.doc
        return (
          <Space>
            <span className={styles.icon}>
              <Icon name={config.icon} size={18} color={config.color} />
            </span>
            <a className={styles.titleLink}>{record.title}</a>
          </Space>
        )
      },
    },
    {
      title: '类型',
      dataIndex: 'tag',
      key: 'tag',
      width: 120,
      render: (tag?: string) => (tag ? <Tag>{tag}</Tag> : <Text type="secondary">-</Text>),
    },
    {
      title: TIME_LABEL[tab],
      dataIndex: 'time',
      key: 'time',
      width: 160,
      render: (t: string) => <Text type="secondary">{t}</Text>,
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Space>
          <Button type="primary" icon={<Icon name="plus" size={14} />}>新建</Button>
          <Button>模板库</Button>
        </Space>
        <Space>
          <Button type="text">配置</Button>
          <Button type="text">全标已读</Button>
          <Button type="text">筛选文档</Button>
          <Button type="text">阅读模式</Button>
        </Space>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          { key: 'recent', label: '最近打开' },
          { key: 'mine', label: '我创建的' },
          { key: 'favorite', label: '我收藏的' },
        ]}
      />

      <Table<FeedItem>
        className={styles.table}
        size="middle"
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 12, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
        dataSource={dataSource}
        columns={columns}
        onRow={(record) => ({
          onClick: () => {
            navigate(`/documents/${record.id}`)
          },
        })}
      />

      <div className={styles.teamBlock}>
        <div className={styles.teamHeader}>
          <Title level={4} style={{ margin: 0 }}>团队空间</Title>
          <Button type="link" onClick={() => navigate('/workspaces')}>管理 →</Button>
        </div>
        {workspaces.length === 0 && !wsLoading ? (
          <Empty description="暂无团队空间">
            <Button type="primary" onClick={() => navigate('/workspaces')}>去创建</Button>
          </Empty>
        ) : (
          <div className={styles.teamGrid}>
            {workspaces.slice(0, 8).map((ws) => (
              <Card
                key={ws.id}
                className={styles.teamCard}
                hoverable
                onClick={() => navigate(`/workspaces/${ws.id}`)}
              >
                <Space>
                  <div className={styles.teamAvatar}>
                    {ws.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.teamName}>{ws.name}</div>
                    <Text type="secondary" className={styles.teamDesc}>
                      {ws.description || '暂无描述'}
                    </Text>
                  </div>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
