import { useMemo, useState } from 'react'
import {
  Alert,
  App,
  Badge,
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'

import {
  UNASSIGNED_KEY,
  UNASSIGNED_LABEL,
  useAdminUsers,
  type OrgSelection,
} from './hooks/useAdminUsers'
import CreateUserModal from './components/CreateUserModal'
import EditUserModal from './components/EditUserModal'
import MoveUserModal from './components/MoveUserModal'
import OrgFormModal from './components/OrgFormModal'
import DeleteOrgModal from './components/DeleteOrgModal'
import type { Organization, User } from '../../services/types'
import Icon from '../../components/Icon'
import styles from './style/index.module.css'

const { Text, Title, Paragraph } = Typography

const PROFESSIONAL_TITLE_LABEL: Record<string, string> = {
  professor: '教授',
  associate_professor: '副教授',
  lecturer: '讲师',
  researcher: '研究员',
  engineer: '工程师',
  doctoral_student: '博士生',
  master_student: '硕士生',
  other: '其他',
}

export default function AdminUsersPage() {
  const { modal, message } = App.useApp()
  const {
    isAdmin,
    authLoading,
    error,
    orgLoading,
    organizations,
    orgSearch,
    setOrgSearch,
    selectedOrg,
    setSelectedOrg,
    usersLoading,
    usersState,
    fetchUsers,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    createUser,
    updateUser,
    deleteUser,
    moveUser,
    resetPassword,
    setUserStatus,
    refresh,
  } = useAdminUsers()

  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [moveUserTarget, setMoveUserTarget] = useState<User | null>(null)
  const [orgFormTarget, setOrgFormTarget] = useState<Organization | null>(null)
  const [orgFormOpen, setOrgFormOpen] = useState(false)
  const [deleteOrgTarget, setDeleteOrgTarget] = useState<Organization | null>(null)

  const selectedOrgEntity = useMemo(() => {
    if (typeof selectedOrg !== 'string' || selectedOrg === UNASSIGNED_KEY) return null
    return organizations.find((o) => o.id === selectedOrg) ?? null
  }, [organizations, selectedOrg])

  if (authLoading || !isAdmin) {
    return (
      <div className={styles.center}>
        <Spin />
      </div>
    )
  }

  const handlePasswordReset = (target: User) => {
    modal.confirm({
      title: `重置密码：${target.username}`,
      content: '将把密码重置为默认初始密码 Research@123，本次操作不可撤销。继续？',
      okText: '重置',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          const pwd = await resetPassword(target.id)
          modal.success({
            title: '密码已重置',
            content: (
              <Paragraph style={{ marginBottom: 0 }}>
                <Text strong>{target.username}</Text> 的新密码：
                <Text copyable code style={{ marginLeft: 4 }}>{pwd}</Text>
              </Paragraph>
            ),
          })
        } catch (err) {
          message.error(err instanceof Error ? err.message : '重置失败')
        }
      },
    })
  }

  const handleDeleteUser = (target: User) => {
    modal.confirm({
      title: `删除用户：${target.username}`,
      content: '该操作不可恢复，确认删除？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      async onOk() {
        try {
          await deleteUser(target.id)
          message.success('已删除')
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  const handleToggleStatus = async (target: User) => {
    const next = target.status === 'disabled' ? 'active' : 'disabled'
    const verb = next === 'disabled' ? '禁用' : '启用'
    modal.confirm({
      title: `${verb}用户：${target.username}`,
      content: next === 'disabled' ? '禁用后该用户将无法登录。继续？' : '启用后该用户可正常登录。继续？',
      okText: verb,
      okButtonProps: next === 'disabled' ? { danger: true } : undefined,
      cancelText: '取消',
      async onOk() {
        try {
          await setUserStatus(target.id, next)
          message.success(`已${verb}`)
        } catch (err) {
          message.error(err instanceof Error ? err.message : `${verb}失败`)
        }
      },
    })
  }

  const columns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 140,
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          {record.status === 'disabled' && <Tag color="red">已禁用</Tag>}
          {record.username === 'admin' && <Tag color="blue">管理员</Tag>}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 220,
    },
    {
      title: '职称',
      dataIndex: 'professionalTitle',
      key: 'professionalTitle',
      width: 100,
      render: (v: string) => PROFESSIONAL_TITLE_LABEL[v] || v || '-',
    },
    {
      title: '导师',
      dataIndex: 'supervisor',
      key: 'supervisor',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '机构',
      dataIndex: 'organization',
      key: 'organization',
      width: 160,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_, record) => {
        const isSelf = false // admin 自身不暴露在普通列表里，AdminOnly 守住，简化处理
        const isAdmin = record.username === 'admin'
        return (
          <Dropdown
            menu={{
              items: [
                { key: 'edit', label: '编辑信息' },
                { key: 'move', label: '移动机构' },
                { key: 'reset', label: '重置密码' },
                {
                  key: 'status',
                  label: record.status === 'disabled' ? '启用账号' : '禁用账号',
                  danger: record.status !== 'disabled',
                  disabled: isAdmin || isSelf,
                },
                { type: 'divider' as const },
                { key: 'delete', label: '删除账号', danger: true, disabled: isAdmin || isSelf },
              ],
              onClick: ({ key }) => {
                switch (key) {
                  case 'edit':
                    setEditUser(record)
                    break
                  case 'move':
                    setMoveUserTarget(record)
                    break
                  case 'reset':
                    handlePasswordReset(record)
                    break
                  case 'status':
                    handleToggleStatus(record)
                    break
                  case 'delete':
                    handleDeleteUser(record)
                    break
                }
              },
            }}
            trigger={['click']}
          >
            <Button size="small" type="text">
              <Icon name="more" size={16} />
            </Button>
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={3} className={styles.title}>
            管理人员
          </Title>
          <Text type="secondary">按机构维度管理账号；机构与人员均可增删改查。</Text>
        </div>
        <Space>
          <Button onClick={refresh}>刷新</Button>
          <Button
            type="primary"
            onClick={() => setCreateUserOpen(true)}
            disabled={selectedOrg === null}
          >
            创建账号
          </Button>
        </Space>
      </div>

      {error && <Alert className={styles.error} type="error" message={error} showIcon />}

      <div className={styles.body}>
        <div className={styles.orgPanel}>
          <div className={styles.orgHeader}>
            <Text strong>机构</Text>
            <Tooltip title="新建机构">
              <Button
                size="small"
                type="text"
                icon={<Icon name="plus" size={14} />}
                onClick={() => {
                  setOrgFormTarget(null)
                  setOrgFormOpen(true)
                }}
              />
            </Tooltip>
          </div>
          <Input.Search
            placeholder="搜索机构"
            allowClear
            value={orgSearch}
            onChange={(e) => setOrgSearch(e.target.value)}
            onSearch={(v) => setOrgSearch(v)}
            size="small"
          />
          <Spin spinning={orgLoading}>
            <ul className={styles.orgList}>
              <li
                key={UNASSIGNED_KEY}
                className={[
                  styles.orgItem,
                  selectedOrg === UNASSIGNED_KEY ? styles.orgItemActive : '',
                ].join(' ')}
                onClick={() => setSelectedOrg(UNASSIGNED_KEY as OrgSelection)}
              >
                <span className={styles.orgName}>{UNASSIGNED_LABEL}</span>
              </li>
              {organizations.map((o) => {
                const active = selectedOrg === o.id
                return (
                  <li
                    key={o.id}
               className={[styles.orgItem, active ? styles.orgItemActive : ''].join(' ')}
                    onClick={() => setSelectedOrg(o.id)}
                  >
                    <Tooltip title={o.description || o.name} placement="right">
                      <span className={styles.orgName}>{o.name}</span>
                    </Tooltip>
                    <Space size={4} onClick={(e) => e.stopPropagation()}>
                      <Badge
                        count={o.userCount ?? 0}
                        showZero
                        color={active ? '#1677ff' : '#bfbfbf'}
                      />
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'edit', label: '编辑机构' },
                            { key: 'delete', label: '删除机构', danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === 'edit') {
                              setOrgFormTarget(o)
                              setOrgFormOpen(true)
                            } else if (key === 'delete') {
                              setDeleteOrgTarget(o)
                            }
                          },
                        }}
                      >
                        <Button size="small" type="text" icon={<Icon name="more" size={14} />} />
                      </Dropdown>
                    </Space>
                  </li>
                )
              })}
              {organizations.length === 0 && !orgLoading && (
                <li className={styles.orgEmpty}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无机构" />
                </li>
              )}
            </ul>
          </Spin>
        </div>

        <div className={styles.userPanel}>
          <div className={styles.userHeader}>
            <div>
              <Text strong>
                {selectedOrg === UNASSIGNED_KEY
                  ? UNASSIGNED_LABEL
                  : selectedOrgEntity?.name || '—'}
              </Text>
              {selectedOrgEntity?.description && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {selectedOrgEntity.description}
                </Text>
              )}
            </div>
            <Input.Search
              placeholder="搜索用户名/邮箱"
              allowClear
              defaultValue={usersState.q}
              onSearch={(v) => {
                if (selectedOrg !== null) {
                  fetchUsers(selectedOrg, 1, usersState.pageSize, v)
                }
              }}
              style={{ width: 260 }}
              size="small"
            />
          </div>
          <Table<User>
            rowKey="id"
            columns={columns}
            dataSource={usersState.items}
            loading={usersLoading}
            scroll={{ x: 880 }}
            pagination={{
              current: usersState.page,
              pageSize: usersState.pageSize,
              total: usersState.total,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (page, pageSize) => {
                if (selectedOrg !== null) {
                  fetchUsers(selectedOrg, page, pageSize, usersState.q)
                }
              },
              showTotal: (total) => `共 ${total} 人`,
            }}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该范围暂无成员" />
              ),
            }}
          />
        </div>
      </div>

      <CreateUserModal
        open={createUserOpen}
        organizations={organizations}
        defaultOrgValue={
          selectedOrg === UNASSIGNED_KEY || typeof selectedOrg !== 'string'
            ? '__unassigned__'
            : selectedOrg
        }
        onCancel={() => setCreateUserOpen(false)}
        onSubmit={createUser}
      />

      <EditUserModal
        open={!!editUser}
        user={editUser}
        onCancel={() => setEditUser(null)}
        onSubmit={updateUser}
      />

      <MoveUserModal
        open={!!moveUserTarget}
        user={moveUserTarget}
        organizations={organizations}
        onCancel={() => setMoveUserTarget(null)}
        onSubmit={moveUser}
      />

      <OrgFormModal
        open={orgFormOpen}
        org={orgFormTarget}
        onCancel={() => setOrgFormOpen(false)}
        onCreate={createOrganization}
        onUpdate={updateOrganization}
      />

      <DeleteOrgModal
        open={!!deleteOrgTarget}
        org={deleteOrgTarget}
        organizations={organizations}
        onCancel={() => setDeleteOrgTarget(null)}
        onSubmit={async (orgId, targetOrgId) => {
          await deleteOrganization(orgId, targetOrgId)
          message.success('机构已删除')
        }}
      />

      {/* 避免 Modal.confirm 出现在严格模式下警告 */}
      <Modal open={false} />
    </div>
  )
}