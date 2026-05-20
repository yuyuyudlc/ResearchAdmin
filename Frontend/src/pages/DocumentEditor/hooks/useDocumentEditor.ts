import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Collaboration from '@tiptap/extension-collaboration'
import StarterKit from '@tiptap/starter-kit'
import { useEditor } from '@tiptap/react'
import * as Y from 'yjs'
import type { DocumentNode } from '../../../services/types'
import { documentService } from '../../../services/document'

export interface DocumentMetaValues {
  title: string
  summary?: string
}

export function useDocumentEditor() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const ydoc = useMemo(() => new Y.Doc(), [documentId])
  const [document, setDocument] = useState<DocumentNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
  }, [ydoc])

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
  }
}
