import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Collaboration from '@tiptap/extension-collaboration'
import StarterKit from '@tiptap/starter-kit'
import { useEditor } from '@tiptap/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import type { DocumentNode } from '../../../services/types'
import { documentService } from '../../../services/document'
import { useAuth } from '../../../contexts/AuthContext'

export interface DocumentMetaValues {
  title: string
  summary?: string
}

function getUniqueColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash % 360)
  return `hsl(${h}, 70%, 45%)`
}

export function useDocumentEditor() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const ydoc = useMemo(() => new Y.Doc(), [documentId])

  const [document, setDocument] = useState<DocumentNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState('')

  // Connection and presence states
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  // Offline persistence provider (IndexedDB)
  const indexeddbProvider = useMemo(() => {
    if (!documentId) return null
    return new IndexeddbPersistence(`doc-offline-${documentId}`, ydoc)
  }, [documentId, ydoc])

  // WebSocket provider (Real-time collaboration sync)
  const provider = useMemo(() => {
    if (!documentId || !token) return null
    const wsPort = 3001
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.hostname
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}`

    return new WebsocketProvider(wsUrl, `documents/${documentId}`, ydoc, {
      params: { token },
      connect: false,
    })
  }, [documentId, token, ydoc])

  // Manage providers connection life cycle
  useEffect(() => {
    if (!provider) return
    provider.connect()
    return () => {
      provider.disconnect()
      provider.destroy()
    }
  }, [provider])

  useEffect(() => {
    if (!indexeddbProvider) return
    indexeddbProvider.on('synced', () => {
      console.log(`[indexeddb] document offline cache loaded for ${documentId}`)
    })
    return () => {
      indexeddbProvider.destroy()
    }
  }, [indexeddbProvider, documentId])

  // Track websocket connection status
  useEffect(() => {
    if (!provider) return

    const handleStatus = (event: any) => {
      setSyncStatus(event.status)
    }

    provider.on('status', handleStatus)
    setSyncStatus(provider.shouldConnect ? 'connecting' : 'disconnected')

    return () => {
      provider.off('status', handleStatus)
    }
  }, [provider])

  // Track online collaborators and cursor presence
  useEffect(() => {
    if (!provider) return

    provider.awareness.setLocalStateField('user', {
      name: user?.displayName || user?.username || '未命名用户',
      email: user?.email || '',
      color: getUniqueColor(user?.id || ''),
    })

    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates()
      const list: any[] = []
      states.forEach((state: any, clientID: number) => {
        if (state.user) {
          list.push({
            ...state.user,
            clientID,
            isSelf: clientID === provider.awareness.clientID,
          })
        }
      })
      setCollaborators(list)
    }

    provider.awareness.on('change', handleAwarenessChange)
    handleAwarenessChange()

    return () => {
      provider.awareness.off('change', handleAwarenessChange)
    }
  }, [provider, user])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      ...(provider ? [
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: user?.displayName || user?.username || '未命名用户',
            color: getUniqueColor(user?.id || ''),
          },
        })
      ] : []),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
  }, [ydoc, provider, user])

  const fetchDocument = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    setError('')
    try {
      const [docRes, bodyRes] = await Promise.all([
        documentService.getDetail(documentId),
        documentService.getBody(documentId).catch(() => null),
      ])
      setDocument(docRes.data)

      if (docRes.data.docType === 'rich_text' && bodyRes && bodyRes.byteLength > 0) {
        Y.applyUpdate(ydoc, new Uint8Array(bodyRes))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文档失败')
      setDocument(null)
    } finally {
      setLoading(false)
    }
  }, [documentId, ydoc])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  useEffect(() => {
    return () => {
      ydoc.destroy()
    }
  }, [ydoc])

  const saveBody = async () => {
    if (!documentId || !editor) return
    setSaving(true)
    try {
      const update = Y.encodeStateAsUpdate(ydoc)
      await documentService.putBody(documentId, update)
      setLastSaved(new Date())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const updateMeta = async (values: DocumentMetaValues) => {
    if (!documentId) return
    setUpdating(true)
    try {
      const res = await documentService.update(documentId, {
        title: values.title.trim(),
        summary: values.summary?.trim() || '',
      })
      setDocument(res.data)
    } finally {
      setUpdating(false)
    }
  }

  const deleteDocument = async () => {
    if (!documentId) return
    const wsId = document?.workspaceId
    await documentService.delete(documentId)
    navigate(wsId ? `/workspaces/${wsId}` : '/workspaces')
  }

  const archiveDocument = async () => {
    if (!documentId) return
    const wsId = document?.workspaceId
    await documentService.archive(documentId)
    navigate(wsId ? `/workspaces/${wsId}` : '/workspaces')
  }

  const restoreDocument = async () => {
    if (!documentId) return
    const res = await documentService.restore(documentId)
    // refresh detail
    await fetchDocument()
    return res
  }

  const moveDocument = async (parentId: string | null, sortOrder: number) => {
    if (!documentId) return
    const res = await documentService.move(documentId, { parentId, sortOrder })
    setDocument(res.data)
    return res.data
  }

  const downloadDocument = async () => {
    if (!documentId) return
    const res = await documentService.download(documentId)
    return res.data
  }

  const handleBack = () => {
    if (document?.workspaceId) {
      navigate(`/workspaces/${document.workspaceId}`)
      return
    }
    navigate('/workspaces')
  }

  return {
    document,
    editor,
    loading,
    saving,
    updating,
    lastSaved,
    error,
    fetchDocument,
    saveBody,
    updateMeta,
    deleteDocument,
    archiveDocument,
    restoreDocument,
    moveDocument,
    downloadDocument,
    handleBack,
    collaborators,
    syncStatus,
  }
}
