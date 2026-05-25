import { Mark, mergeAttributes } from '@tiptap/core'

export const COMMENT_THREAD_MARK_NAME = 'commentThread'

export const CommentThreadMark = Mark.create({
  name: COMMENT_THREAD_MARK_NAME,
  inclusive: false,
  priority: 1100,

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-thread-id'),
        renderHTML: (attributes) => {
          if (!attributes.threadId) {
            return {}
          }

          return {
            'data-thread-id': attributes.threadId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-thread-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(HTMLAttributes, {
        class: 'comment-thread-mark',
      }),
      0,
    ]
  },
})
