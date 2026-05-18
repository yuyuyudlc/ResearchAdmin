import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { App, Button, Spin, Tooltip, Typography } from 'antd'
import { usePrivateSpace } from '../../contexts/PrivateSpaceContext'
import { workspaceService } from '../../services/workspace'
import type { Workspace } from '../../services/types'
import { useWorkspaceTrees } from '../../hooks/useWorkspaceTrees'
import DocumentTree from '../DocumentTree'
import Icon from '../Icon'
import CreateDocModal, { type CreateContext } from './CreateDocModal'
import styles from './style.module.css'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { workspaceId: routeWsId } = useParams<{ workspaceId: string }>()
  const { message } = App.useApp()

  const {
    workspace: privateWs,
    tree: privateTree,
    loading: privateLoading,
    refresh: refreshPrivate,
    createDocument: createPrivate,
    moveDocument: movePrivate,
    removeDocument: removePrivate,
  } = usePrivateSpace()

  const [privateOpen, setPrivateOpen] = useState(true)
  const [teamOpen, setTeamOpen] = useState(true)
  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set())
  const wsTrees = useWorkspaceTrees()

  const [createCtx, setCreateCtx] = useState<CreateContext | null>(null)

  const loadTeam = useCallback(async () => {
    setTeamLoading(true)
    try {
      const res = await workspaceService.list()
      // 团队空间 = 排除私人空间所占的那一个工作区
      const items = res.data.items.filter((w) => w.id !== privateWs?.id)
      setTeamWorkspaces(items)
    } catch {
      setTeamWorkspaces([])
    } finally {
      setTeamLoading(false)
    }
  }, [privateWs?.id])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  // 当路由进入某个 workspace 详情时，自动展开它
  useEffect(() => {
    if (routeWsId && !expandedWs.has(routeWsId)) {
      setExpandedWs((prev) => new Set(prev).add(routeWsId))
      wsTrees.loadTree(routeWsId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeWsId])

  const isHomeActive = location.pathname === '/'
  const isTeamRouteActive = location.pathname.startsWith('/workspaces')

  const toggleWs = (ws: Workspace) => {
    setExpandedWs((prev) => {
      const next = new Set(prev)
      if (next.has(ws.id)) {
        next.delete(ws.id)
      } else {
        next.add(ws.id)
        wsTrees.loadTree(ws.id)
      }
      return next
    })
  }

  const openCreatePrivate = (parentId: string | null) => {
    setCreateCtx({ scope: 'private', parentId })
  }
  const openCreateTeam = (workspaceId: string, parentId: string | null) => {
    setCreateCtx({ scope: 'team', workspaceId, parentId })
  }

  const handleCreate = async (values: { title: string; docType: string; summary?: string }) => {
    if (!createCtx) return
    try {
      if (createCtx.scope === 'private') {
        const doc = await createPrivate(createCtx.parentId, values)
        message.success('已创建')
        if (doc && doc.docType !== 'folder') navigate(`/documents/${doc.id}`)
      } else {
        const doc = await wsTrees.createDocument(
          createCtx.workspaceId,
          createCtx.parentId,
          values,
        )
        message.success('已创建')
        if (doc && doc.docType !== 'folder') navigate(`/documents/${doc.id}`)
      }
      setCreateCtx(null)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败')
    }
  }

  return (
    <div className={styles.sidebar}>
      {/* 首页 */}
      <div
        className={[styles.entry, isHomeActive ? styles.entryActive : ''].join(' ')}
        onClick={() => navigate('/')}
      >
        <span className={styles.entryIcon}>
          <Icon name="home" size={16} />
        </span>
        <span>首页</span>
      </div>

      {/* 私人空间 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setPrivateOpen((v) => !v)}>
          <span className={styles.caret}>
            <Icon name={privateOpen ? 'caret-down' : 'caret-right'} size={14} />
          </span>
          <span className={styles.entryIcon}>
            <Icon name="user" size={16} />
          </span>
          <span className={styles.sectionTitle}>私人空间</span>
          <span className={styles.sectionActions} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="刷新">
              <Button
                type="text"
                size="small"
                icon={<Icon name="refresh" size={14} />}
                onClick={refreshPrivate}
              />
            </Tooltip>
            <Tooltip title="新建文档">
              <Button
                type="text"
                size="small"
                icon={<Icon name="plus" size={14} />}
                disabled={!privateWs}
                onClick={() => openCreatePrivate(null)}
              />
            </Tooltip>
          </span>
        </div>
        {privateOpen && (
          <div className={styles.sectionBody}>
            {privateWs ? (
              <DocumentTree
                tree={privateTree}
                loading={privateLoading}
                onCreate={openCreatePrivate}
                onMove={(sourceId, parentId, sortOrder) =>
                  movePrivate(sourceId, parentId, sortOrder)
                }
                onRemove={removePrivate}
              />
            ) : (
              <div className={styles.placeholder}>
                <Typography.Text type="secondary">尚未创建工作区</Typography.Text>
                <Button size="small" block onClick={() => navigate('/workspaces')}>
                  去创建
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 团队空间 */}
      <div className={styles.section}>
        <div
          className={[
            styles.sectionHeader,
            isTeamRouteActive ? styles.sectionHeaderActive : '',
          ].join(' ')}
          onClick={() => setTeamOpen((v) => !v)}
        >
          <span className={styles.caret}>
            <Icon name={teamOpen ? 'caret-down' : 'caret-right'} size={14} />
          </span>
          <span className={styles.entryIcon}>
            <Icon name="team" size={16} />
          </span>
          <span
            className={styles.sectionTitle}
            onClick={(e) => {
              e.stopPropagation()
              navigate('/workspaces')
            }}
          >
            团队空间
          </span>
          <span className={styles.sectionActions} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="管理">
              <Button
                type="text"
                size="small"
                icon={<Icon name="settings" size={14} />}
                onClick={() => navigate('/workspaces')}
              />
            </Tooltip>
          </span>
        </div>
        {teamOpen && (
          <div className={styles.sectionBody}>
            <Spin spinning={teamLoading}>
              {teamWorkspaces.length === 0 && !teamLoading ? (
                <div className={styles.placeholder}>
                  <Typography.Text type="secondary">暂无团队空间</Typography.Text>
                  <Button size="small" block onClick={() => navigate('/workspaces')}>
                    去创建
                  </Button>
                </div>
              ) : (
                teamWorkspaces.map((ws) => {
                  const opened = expandedWs.has(ws.id)
                  const state = wsTrees.map[ws.id]
                  const active = routeWsId === ws.id
                  return (
                    <div key={ws.id} className={styles.wsBlock}>
                      <div
                        className={[
                          styles.wsHeader,
                          active ? styles.wsHeaderActive : '',
                        ].join(' ')}
                        onClick={() => {
                          toggleWs(ws)
                          navigate(`/workspaces/${ws.id}`)
                        }}
                      >
                        <span className={styles.caret}>
                          <Icon name={opened ? 'caret-down' : 'caret-right'} size={14} />
                        </span>
                        <span className={styles.wsIcon}>
                          {ws.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className={styles.wsName} title={ws.name}>
                          {ws.name}
                        </span>
                        <span
                          className={styles.sectionActions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="新建文档">
                            <Button
                              type="text"
                              size="small"
                              icon={<Icon name="plus" size={14} />}
                              onClick={() => openCreateTeam(ws.id, null)}
                            />
                          </Tooltip>
                        </span>
                      </div>
                      {opened && (
                        <div className={styles.wsTree}>
                          <DocumentTree
                            tree={state?.tree ?? []}
                            loading={state?.loading}
                            onCreate={(parentId) => openCreateTeam(ws.id, parentId)}
                            onMove={(sourceId, parentId, sortOrder) =>
                              wsTrees.moveDocument(ws.id, sourceId, parentId, sortOrder)
                            }
                            onRemove={(docId) => wsTrees.removeDocument(ws.id, docId)}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </Spin>
          </div>
        )}
      </div>

      <CreateDocModal
        ctx={createCtx}
        onCancel={() => setCreateCtx(null)}
        onSubmit={handleCreate}
      />
    </div>
  )
}