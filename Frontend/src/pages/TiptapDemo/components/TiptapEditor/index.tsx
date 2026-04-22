import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { EditorContent } from '@tiptap/react'

import { useTiptapEditor } from './hooks/useTiptapEditor'
import styles from './style/index.module.css'

function TiptapEditor() {
  const { editor } = useTiptapEditor()

  if (!editor) {
    return <div className={styles.loading}>Loading editor...</div>
  }

  return (
    <div className={styles.wrapper}>
      <EditorContent className={styles.editor} editor={editor} />
      <DragHandle editor={editor} className={styles.dragHandle} nested>
        <button className={styles.dragButton} type="button" aria-label="拖拽节点">
          ⠿
        </button>
      </DragHandle>
    </div>
  )
}

export default TiptapEditor
