import { useEffect, useState } from 'react'

export function useCommentSelectionBubble(open: boolean) {
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!open) {
      setContent('')
    }
  }, [open])

  return {
    content,
    setContent,
  }
}
