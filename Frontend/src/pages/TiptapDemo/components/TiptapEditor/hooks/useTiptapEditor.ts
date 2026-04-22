import StarterKit from '@tiptap/starter-kit'
import { useEditor } from '@tiptap/react'

const INITIAL_CONTENT = `
  <h2>Tiptap 节点拖拽</h2>
  <p>这是一个可拖拽节点的 demo。你可以拖动段落、标题、列表等块级节点。</p>
  <blockquote>拖动方式：将鼠标移动到左侧手柄，按住并上下移动。</blockquote>
  <ul>
    <li>第一条任务</li>
    <li>第二条任务</li>
    <li>第三条任务</li>
  </ul>
  <p>再加一段文本，便于观察节点重排后的结果。</p>
`

export function useTiptapEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
  })

  return { editor }
}
