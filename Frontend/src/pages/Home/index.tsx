import { useEffect, useMemo, useState } from 'react'
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
import type { Workspace } from '../../services/types'
import Icon, { type IconName } from '../../components/Icon'
import styles from './style.module.css'

const { Title, Text } = Typography

interface FeedItem {
  id: string
  title: string
  type: 'doc' | 'sheet' | 'folder'
  sender: string
  receivedAt: string
  unread?: boolean
  tag?: string
}

const ICON_BY_TYPE: Record<FeedItem['type'], IconName> = {
  doc: 'file',
  sheet: 'file',
  folder: 'folder',
}

const ICON_COLOR_BY_TYPE: Record<FeedItem['type'], string> = {
  doc: '#1677ff',
  sheet: '#52c41a',
  folder: '#faad14',
}

function makeMock(count: number, prefix: string): FeedItem[] {
  const senders = ['苏志华', '贺永琪', '赵秀杰', '魏国富', '宋萌', '王佑佑', '郎丽丽', '胡鹤伟']
  const titles = [
    'TRD-价格流水日志变更',
    '如何申请商家中心子应用？',
    '【禁止外传】别人都想要你的钱，但我关心你的身体~京造…',
    '2026-0518至0522上线checklist',
    '2026-0511至0515上线',
    'js治理',
    '商品平台化-商品渲染线上灰度放量跟进',
    '"开箱"展亭落地北京职场 【动手工坊】开启招募！',
    '商品发品的错误码信息',
    '2026-H1',
    '618新品手机特惠',
    '宠物节内购福利拉满，品类新享抄底价',
  ]
  const today = new Date()
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(today.getTime() - i * 6 * 3600 * 1000)
    const dayDiff = Math.floor((today.getTime() - d.getTime()) / (24 * 3600 * 1000))
    let receivedAt: string
    if (dayDiff === 0) {
      receivedAt = `今天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } else {
      receivedAt = `${d.getMonth() + 1}月${d.getDate()}日`
    }
    return {
      id: `${prefix}-${i}`,
      title: titles[i % titles.length],
      type: (i % 5 === 0 ? 'sheet' : i % 7 === 0 ? 'folder' : 'doc') as FeedItem['type'],
      sender: senders[i % senders.length],
      receivedAt,
      unread: i < 5,
      tag: i % 3 === 0 ? '研发' : i % 3 === 1 ? '产品' : undefined,
    }
  })
}

const RECEIVED = makeMock(20, 'received')
const RECENT = makeMock(15, 'recent')
const MINE = makeMock(12, 'mine')
const SENT = makeMock(10, 'sent')

export default function HomePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'received' | 'recent' | 'mine' | 'sent'>('received')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [wsLoading, setWsLoading] = useState(false)

  useEffect(() => {
    setWsLoading(true)
    workspaceService
      .list()
      .then((res) => setWorkspaces(res.data.items))
      .catch(() => setWorkspaces([]))
      .finally(() => setWsLoading(false))
  }, [])

  const dataSource = useMemo(() => {
    switch (tab) {
      case 'received': return RECEIVED
      case 'recent': return RECENT
      case 'mine': return MINE
      case 'sent': return SENT
    }
  }, [tab])

  const columns: ColumnsType<FeedItem> = [
    {
      title: '所有类型',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <Space>
          {record.unread && <span className={styles.unreadDot} />}
          <span className={styles.icon}>
            <Icon
              name={ICON_BY_TYPE[record.type]}
              size={18}
              color={ICON_COLOR_BY_TYPE[record.type]}
            />
          </span>
          <a className={styles.titleLink}>{record.title}</a>
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tag',
      key: 'tag',
      width: 120,
      render: (tag?: string) => (tag ? <Tag>{tag}</Tag> : <Text type="secondary">-</Text>),
    },
    {
      title: tab === 'sent' || tab === 'mine' ? '接收人' : '发送人',
      dataIndex: 'sender',
      key: 'sender',
      width: 140,
    },
    {
      title: tab === 'recent' ? '最近访问' : '接收时间',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      width: 140,
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
        onChange={(k) => setTab(k as typeof tab)}
        items={[
          { key: 'received', label: <span>我收到的<Tag color="red" style={{ marginLeft: 6 }}>99+</Tag></span> },
          { key: 'recent', label: '最近打开' },
          { key: 'mine', label: '我创建的' },
          { key: 'sent', label: '我发送的' },
        ]}
      />

      <Table<FeedItem>
        className={styles.table}
        size="middle"
        rowKey="id"
        pagination={{ pageSize: 12, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
        dataSource={dataSource}
        columns={columns}
        onRow={(record) => ({
          onClick: () => {
            // mock 项无真实 id，演示用：若是真实 id 跳编辑器
            if (!record.id.includes('-')) navigate(`/documents/${record.id}`)
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