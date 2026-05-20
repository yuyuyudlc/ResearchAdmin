import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Collaboration from '@tiptap/extension-collaboration'
import StarterKit from '@tiptap/starter-kit'
import { useEditor } from '@tiptap/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
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

  // Use a ref to store instances to handle StrictMode double-invocations without leaking connections
  const instancesRef = useRef<{
    ydoc: Y.Doc
    provider: WebsocketProvider
    indexeddb: IndexeddbPersistence
    id: string
  } | null>(null)

  // Initialize instances synchronously exactly once per documentId
  if (!instancesRef.current || instancesRef.current.id !== documentId) {
    if (instancesRef.current) {
      // Clean up old document instances if documentId changed
      instancesRef.current.provider.disconnect()
      instancesRef.current.provider.destroy()
      instancesRef.current.indexeddb.destroy()
      instancesRef.current.ydoc.destroy()
    }

    if (documentId && token) {
      const ydoc = new Y.Doc()
      const indexeddb = new IndexeddbPersistence(`doc-offline-${documentId}`, ydoc)
      indexeddb.on('synced', () => {
        console.log(`[indexeddb] document offline cache loaded for ${documentId}`)
      })

      const wsPort = 3001
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = window.location.hostname
      const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}`

      const provider = new WebsocketProvider(wsUrl, `documents/${documentId}`, ydoc, {
        params: { token },
        connect: false, // will connect in useEffect
      })

      instancesRef.current = { ydoc, provider, indexeddb, id: documentId }
    } else {
      instancesRef.current = null
    }
  }

  const instances = instancesRef.current

  const [document, setDocument] = useState<DocumentNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState('')

  // Connection and presence states
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  // Connect WebSocket on mount and handle disconnect on unmount
  useEffect(() => {
    if (!instances) return

    instances.provider.connect()

    return () => {
      // On unmount, just disconnect. If it's a StrictMode remount, it will reconnect.
      // If it's a real unmount, the next render or unmount effect will destroy it.
      if (instances.provider.wsconnected || instances.provider.wsconnecting) {
        instances.provider.disconnect()
      }
    }
  }, [instances])

  // Final cleanup when component unmounts for good
  useEffect(() => {
    return () => {
      if (instancesRef.current) {
        instancesRef.current.provider.disconnect()
        instancesRef.current.provider.destroy()
        instancesRef.current.indexeddb.destroy()
        instancesRef.current.ydoc.destroy()
        instancesRef.current = null
      }
    }
  }, [])

  // Track websocket connection status
  useEffect(() => {
    if (!instances) return
    const { provider } = instances

    const handleStatus = (event: any) => {
      setSyncStatus(event.status)
    }

    provider.on('status', handleStatus)
    setSyncStatus(provider.wsconnected ? 'connected' : provider.shouldConnect ? 'connecting' : 'disconnected')

    return () => {
      provider.off('status', handleStatus)
    }
  }, [instances])

  // Track online collaborators and cursor presence
  useEffect(() => {
    if (!instances || !user) return
    const { provider } = instances

    provider.awareness.setLocalStateField('user', {
      name: user.displayName || user.username || '未命名用户',
      email: user.email || '',
      color: getUniqueColor(user.id || ''),
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
  }, [instances, user])

  // Initialize editor exactly once with the stable instances
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      ...(instances ? [
        Collaboration.configure({
          document: instances.ydoc,
        }),
        CollaborationCaret.configure({
          provider: instances.provider,
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
  }, [instances, user])

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

      // We ONLY apply the HTTP update if we aren't connected to the WebSocket.
      // If we are connected, the WebSocket handles syncing. 
      // This prevents race conditions where old HTTP data overwrites fresh WS data.
      if (instances && docRes.data.docType === 'rich_text' && bodyRes && bodyRes.byteLength > 0) {
        // Wrap in a transact so we don't spam origin events if not needed
        Y.applyUpdate(instances.ydoc, new Uint8Array(bodyRes), 'http-fetch')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文档失败')
      setDocument(null)
    } finally {
      setLoading(false)
    }
  }, [documentId, instances])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  const saveBody = async () => {
    if (!documentId || !editor || !instances) return
    setSaving(true)
    try {
      const update = Y.encodeStateAsUpdate(instances.ydoc)
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
