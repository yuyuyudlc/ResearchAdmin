import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import { COMMENT_THREAD_MARK_NAME } from './commentMark'

export interface CommentAuthor {
  id: string
  name: string
  avatarUrl?: string
  color: string
}

export interface CommentMessage {
  id: string
  parentId: string | null
  content: string
  createdAt: string
  author: CommentAuthor
}

export interface ThreadAnchorRange {
  from: number
  to: number
}

export interface ThreadAnchor {
  from: number
  to: number
  text: string
  ranges: ThreadAnchorRange[]
}

export interface CommentThread {
  id: string
  status: 'open' | 'resolved'
  createdAt: string
  updatedAt: string
  author: CommentAuthor
  anchorText: string
  anchorPreview: string
  invalidAnchor: boolean
  messages: CommentMessage[]
  anchor: ThreadAnchor | null
}

export interface PendingCommentSelection {
  from: number
  to: number
  text: string
  top: number
  left: number
  blockedReason: string
}

export interface Collaborator {
  clientId: number
  name: string
  color: string
  avatarUrl?: string
  isCurrentUser: boolean
}

export interface CurrentUserIdentity {
  id: string
  name: string
  avatarUrl?: string
}

const THREADS_ROOT_KEY = 'commentThreads'
const COLOR_PALETTE = [
  '#0070f3',
  '#eb5757',
  '#f2994a',
  '#219653',
  '#2d9cdb',
  '#9b51e0',
  '#6d4c41',
  '#d81b60',
]

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createUserColor(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return COLOR_PALETTE[hash % COLOR_PALETTE.length]
}

export function getCommentThreadsRoot(ydoc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return ydoc.getMap<Y.Map<unknown>>(THREADS_ROOT_KEY)
}

export function collectThreadAnchors(editor: Editor | null): Map<string, ThreadAnchor> {
  const anchors = new Map<string, ThreadAnchor>()

  if (!editor) {
    return anchors
  }

  editor.state.doc.descendants((node, position) => {
    if (!node.isText || !node.text) {
      return
    }

    const from = position
    const to = position + node.nodeSize

    node.marks.forEach((mark) => {
      if (mark.type.name !== COMMENT_THREAD_MARK_NAME || !mark.attrs.threadId) {
        return
      }

      const threadId = String(mark.attrs.threadId)
      const existing = anchors.get(threadId)

      if (!existing) {
        anchors.set(threadId, {
          from,
          to,
          text: node.text ?? '',
          ranges: [{ from, to }],
        })
        return
      }

      existing.from = Math.min(existing.from, from)
      existing.to = Math.max(existing.to, to)
      existing.text += node.text ?? ''
      existing.ranges.push({ from, to })
    })
  })

  return anchors
}

function hasConflictingCommentMark(
  editor: Editor,
  from: number,
  to: number,
  allowedThreadId?: string,
): boolean {
  let blocked = false

  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText || blocked) {
      return
    }

    blocked = node.marks.some((mark) => {
      if (mark.type.name !== COMMENT_THREAD_MARK_NAME) {
        return false
      }

      return allowedThreadId ? mark.attrs.threadId !== allowedThreadId : true
    })
  })

  return blocked
}

export function getPendingCommentSelection(editor: Editor | null): PendingCommentSelection | null {
  if (!editor) {
    return null
  }

  const { from, to, empty } = editor.state.selection
  if (empty || from === to) {
    return null
  }

  const text = editor.state.doc.textBetween(from, to, ' ').trim()
  if (!text) {
    return null
  }

  const startRect = editor.view.coordsAtPos(from)
  const endRect = editor.view.coordsAtPos(to)

  return {
    from,
    to,
    text,
    top: Math.min(startRect.top, endRect.top) + window.scrollY,
    left: (startRect.left + endRect.right) / 2 + window.scrollX,
    blockedReason: hasConflictingCommentMark(editor, from, to)
      ? '所选内容已存在其他批注，无法重复创建线程'
      : '',
  }
}

function createAuthor(user: CurrentUserIdentity): CommentAuthor {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    color: createUserColor(user.id),
  }
}

function createMessageDoc(
  user: CurrentUserIdentity,
  content: string,
  parentId: string | null,
): Y.Map<unknown> {
  const messageDoc = new Y.Map<unknown>()
  messageDoc.set('id', createId('message'))
  messageDoc.set('parentId', parentId)
  messageDoc.set('content', content.trim())
  messageDoc.set('createdAt', new Date().toISOString())
  messageDoc.set('authorId', user.id)
  messageDoc.set('authorName', user.name)
  messageDoc.set('authorAvatarUrl', user.avatarUrl ?? '')
  messageDoc.set('authorColor', createUserColor(user.id))
  return messageDoc
}

export function createCommentThread(
  ydoc: Y.Doc,
  editor: Editor,
  user: CurrentUserIdentity,
  selection: PendingCommentSelection,
  content: string,
): string {
  if (selection.blockedReason) {
    throw new Error(selection.blockedReason)
  }

  const threadId = createId('thread')
  const markType = editor.state.schema.marks[COMMENT_THREAD_MARK_NAME]
  if (!markType) {
    throw new Error('批注扩展未初始化')
  }

  const transaction = editor.state.tr
  transaction.addMark(
    selection.from,
    selection.to,
    markType.create({ threadId }),
  )
  editor.view.dispatch(transaction)

  const anchor = collectThreadAnchors(editor).get(threadId)

  ydoc.transact(() => {
    const threadDoc = new Y.Map<unknown>()
    const messages = new Y.Array<Y.Map<unknown>>()
    const now = new Date().toISOString()
    const author = createAuthor(user)

    threadDoc.set('id', threadId)
    threadDoc.set('status', 'open')
    threadDoc.set('createdAt', now)
    threadDoc.set('updatedAt', now)
    threadDoc.set('authorId', author.id)
    threadDoc.set('authorName', author.name)
    threadDoc.set('authorAvatarUrl', author.avatarUrl ?? '')
    threadDoc.set('authorColor', author.color)
    threadDoc.set('anchorText', anchor?.text ?? selection.text)
    threadDoc.set('anchorPreview', (anchor?.text ?? selection.text).slice(0, 160))
    messages.push([createMessageDoc(user, content, null)])
    threadDoc.set('messages', messages)

    getCommentThreadsRoot(ydoc).set(threadId, threadDoc)
  })

  return threadId
}

export function addReplyToThread(
  ydoc: Y.Doc,
  threadId: string,
  user: CurrentUserIdentity,
  content: string,
  parentId: string | null,
): void {
  const threadDoc = getCommentThreadsRoot(ydoc).get(threadId)
  if (!threadDoc) {
    throw new Error('讨论线程不存在')
  }

  const messages = threadDoc.get('messages') as Y.Array<Y.Map<unknown>> | undefined
  if (!messages) {
    throw new Error('讨论线程数据损坏')
  }

  ydoc.transact(() => {
    messages.push([createMessageDoc(user, content, parentId)])
    threadDoc.set('updatedAt', new Date().toISOString())
  })
}

export function updateThreadStatus(
  ydoc: Y.Doc,
  threadId: string,
  status: 'open' | 'resolved',
): void {
  const threadDoc = getCommentThreadsRoot(ydoc).get(threadId)
  if (!threadDoc) {
    throw new Error('讨论线程不存在')
  }

  ydoc.transact(() => {
    threadDoc.set('status', status)
    threadDoc.set('updatedAt', new Date().toISOString())
  })
}

export function relocateThreadAnchor(
  ydoc: Y.Doc,
  editor: Editor,
  threadId: string,
  selection: PendingCommentSelection,
): void {
  if (selection.blockedReason) {
    throw new Error(selection.blockedReason)
  }

  if (hasConflictingCommentMark(editor, selection.from, selection.to, threadId)) {
    throw new Error('所选内容已存在其他批注，无法重新定位')
  }

  const markType = editor.state.schema.marks[COMMENT_THREAD_MARK_NAME]
  if (!markType) {
    throw new Error('批注扩展未初始化')
  }

  const existingAnchor = collectThreadAnchors(editor).get(threadId)
  let transaction = editor.state.tr

  existingAnchor?.ranges.forEach((range) => {
    transaction = transaction.removeMark(range.from, range.to, markType)
  })

  transaction = transaction.addMark(
    selection.from,
    selection.to,
    markType.create({ threadId }),
  )

  editor.view.dispatch(transaction)

  const nextAnchor = collectThreadAnchors(editor).get(threadId)
  const threadDoc = getCommentThreadsRoot(ydoc).get(threadId)
  if (!threadDoc) {
    return
  }

  ydoc.transact(() => {
    threadDoc.set('anchorText', nextAnchor?.text ?? selection.text)
    threadDoc.set('anchorPreview', (nextAnchor?.text ?? selection.text).slice(0, 160))
    threadDoc.set('updatedAt', new Date().toISOString())
  })
}

export function focusThreadAnchor(editor: Editor | null, thread: CommentThread): boolean {
  if (!editor || !thread.anchor) {
    return false
  }

  editor.chain().focus().setTextSelection({
    from: thread.anchor.from,
    to: thread.anchor.to,
  }).run()

  const node = editor.view.dom.querySelector<HTMLElement>(
    `[data-thread-id="${thread.id}"]`,
  )
  node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  return true
}

function readAuthor(source: Y.Map<unknown>): CommentAuthor {
  return {
    id: String(source.get('authorId') ?? ''),
    name: String(source.get('authorName') ?? '未命名用户'),
    avatarUrl: String(source.get('authorAvatarUrl') ?? '') || undefined,
    color: String(source.get('authorColor') ?? '#0070f3'),
  }
}

function readMessage(messageDoc: Y.Map<unknown>): CommentMessage {
  return {
    id: String(messageDoc.get('id') ?? ''),
    parentId: (messageDoc.get('parentId') as string | null | undefined) ?? null,
    content: String(messageDoc.get('content') ?? ''),
    createdAt: String(messageDoc.get('createdAt') ?? ''),
    author: readAuthor(messageDoc),
  }
}

export function readCommentThreads(
  ydoc: Y.Doc,
  editor: Editor | null,
): CommentThread[] {
  const anchors = collectThreadAnchors(editor)
  const threads: CommentThread[] = []

  getCommentThreadsRoot(ydoc).forEach((threadDoc, threadId) => {
    const messages = (threadDoc.get('messages') as Y.Array<Y.Map<unknown>> | undefined)
      ?.toArray()
      .map(readMessage) ?? []
    const anchor = anchors.get(threadId) ?? null
    const anchorPreview = String(threadDoc.get('anchorPreview') ?? '')

    threads.push({
      id: String(threadDoc.get('id') ?? threadId),
      status: (threadDoc.get('status') as 'open' | 'resolved' | undefined) ?? 'open',
      createdAt: String(threadDoc.get('createdAt') ?? ''),
      updatedAt: String(threadDoc.get('updatedAt') ?? ''),
      author: readAuthor(threadDoc),
      anchorText: String(threadDoc.get('anchorText') ?? anchor?.text ?? ''),
      anchorPreview: anchor?.text?.slice(0, 160) || anchorPreview,
      invalidAnchor: !anchor,
      messages,
      anchor,
    })
  })

  return threads.sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'open' ? -1 : 1
    }

    return right.updatedAt.localeCompare(left.updatedAt)
  })
}

export function readCollaborators(
  awareness: {
    clientID: number
    getStates: () => Map<number, unknown>
  } | null,
  currentUserId: string,
): Collaborator[] {
  if (!awareness) {
    return []
  }

  const collaborators: Collaborator[] = []
  awareness.getStates().forEach((state, clientId) => {
    const awarenessState = state as {
      user?: {
        id?: string
        name?: string
        color?: string
        avatarUrl?: string
      }
    }

    const user = awarenessState.user
    if (!user) {
      return
    }

    collaborators.push({
      clientId,
      name: user.name || '匿名协作者',
      color: user.color || '#0070f3',
      avatarUrl: user.avatarUrl,
      isCurrentUser: user.id === currentUserId,
    })
  })

  return collaborators.sort((left, right) => Number(right.isCurrentUser) - Number(left.isCurrentUser))
}
