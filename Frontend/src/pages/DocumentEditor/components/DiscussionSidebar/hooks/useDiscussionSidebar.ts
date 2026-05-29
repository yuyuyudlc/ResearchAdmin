import { useEffect, useMemo, useState } from 'react'
import type { CommentThread } from '../../../hooks/commentThreads'

export function useDiscussionSidebar(threads: CommentThread[]) {
  const [replyingToId, setReplyingToId] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [expandedResolvedIds, setExpandedResolvedIds] = useState<string[]>([])

  useEffect(() => {
    setExpandedResolvedIds((current) => current.filter((id) => threads.some((thread) => thread.id === id)))
  }, [threads])

  const threadStats = useMemo(() => {
    const open = threads.filter((thread) => thread.status === 'open').length
    const resolved = threads.length - open
    return { open, resolved }
  }, [threads])

  const toggleResolvedThread = (threadId: string) => {
    setExpandedResolvedIds((current) => (
      current.includes(threadId)
        ? current.filter((id) => id !== threadId)
        : [...current, threadId]
    ))
  }

  const clearReply = () => {
    setReplyingToId('')
    setReplyContent('')
  }

  return {
    replyingToId,
    replyContent,
    expandedResolvedIds,
    threadStats,
    setReplyingToId,
    setReplyContent,
    toggleResolvedThread,
    clearReply,
  }
}
