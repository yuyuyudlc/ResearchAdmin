import { useEffect, useRef, useMemo, useState, startTransition } from 'react'
import { App, Button } from 'antd'
import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import styles from './style.module.css'

interface Props {
  data: ArrayBuffer
  onSave?: (data: Uint8Array) => Promise<void>
  saving?: boolean
  filename?: string
}

function isZipFormat(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false
  const header = new Uint8Array(buf.slice(0, 4))
  return header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04
}

function getTextRuns(node: HTMLElement): TextRun[] {
  const runs: TextRun[] = []

  function walk(el: Node, bold: boolean, italic: boolean, hyperlink: boolean) {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || ''
        if (text) {
          runs.push(new TextRun({ text, bold, italics: italic, style: hyperlink ? 'Hyperlink' : undefined }))
        }
      } else if (child instanceof HTMLElement) {
        const tag = child.tagName.toLowerCase()
        if (tag === 'br') {
          runs.push(new TextRun({ text: '\n', bold, italics: italic }))
        } else {
          walk(child,
            bold || tag === 'strong' || tag === 'b',
            italic || tag === 'em' || tag === 'i',
            hyperlink || tag === 'a')
        }
      }
    }
  }

  walk(node, false, false, false)
  return runs
}

function htmlToDocx(html: string): Promise<Uint8Array> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body
  const paragraphs: Paragraph[] = []

  const children = Array.from(body.children)
  for (const el of children) {
    const tag = el.tagName.toLowerCase()

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const headingLevel = tag === 'h1' ? HeadingLevel.HEADING_1
                         : tag === 'h2' ? HeadingLevel.HEADING_2
                         : HeadingLevel.HEADING_3
      const size = tag === 'h1' ? 48 : tag === 'h2' ? 36 : 30
      paragraphs.push(
        new Paragraph({
          heading: headingLevel,
          children: [new TextRun({ text: el.textContent || '', bold: true, size })],
        })
      )
    } else if (tag === 'p' || tag === 'div') {
      const runs = getTextRuns(el as HTMLElement)
      if (runs.length === 0) {
        runs.push(new TextRun({ text: '' }))
      }
      paragraphs.push(new Paragraph({ children: runs }))
    } else if (tag === 'ul' || tag === 'ol') {
      for (const li of Array.from(el.children)) {
        const runs = getTextRuns(li as HTMLElement)
        paragraphs.push(
          new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun({ text: '' })],
            bullet: { level: 0 },
          })
        )
      }
    } else if (tag === 'blockquote') {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: el.textContent || '' })],
          indent: { left: 720 },
        })
      )
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
  }

  const docx = new Document({
    sections: [{ children: paragraphs }],
  })

  return Packer.toBlob(docx).then(async (blob) => {
    const buffer = await blob.arrayBuffer()
    return new Uint8Array(buffer)
  })
}

export default function WordEditor({ data, onSave, saving, filename }: Props) {
  const { message } = App.useApp()
  const editorRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [formatError, setFormatError] = useState(false)

  const isDocx = useMemo(() => isZipFormat(data), [data])

  useEffect(() => {
    if (!isDocx) {
      startTransition(() => {
        setFormatError(true)
        setLoading(false)
      })
      return
    }
    mammoth.convertToHtml({ arrayBuffer: data })
      .then((result) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = result.value
        }
        startTransition(() => {
          setLoading(false)
        })
      })
      .catch(() => {
        startTransition(() => {
          setFormatError(true)
          setLoading(false)
        })
      })
  }, [data, message, isDocx])

  const handleSave = async () => {
    if (!editorRef.current || !onSave) return
    const html = editorRef.current.innerHTML
    try {
      const buffer = await htmlToDocx(html)
      await onSave(buffer)
      setDirty(false)
      message.success('文档已保存')
    } catch (err) {
      console.error('WordEditor save failed:', err)
      message.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  const downloadFile = () => {
    const blob = new Blob([data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'document.doc'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.viewerArea} style={{ placeItems: 'center', display: 'grid' }}>
          <span>正在解析 Word 文档...</span>
        </div>
      </div>
    )
  }

  if (formatError) {
    return (
      <div className={styles.container}>
        <div className={styles.viewerArea} style={{ placeItems: 'center', display: 'grid', gap: 16 }}>
          <span style={{ color: '#ee0000', fontSize: 16 }}>无法预览此 Word 文档</span>
          <span style={{ fontSize: 13, color: '#888', maxWidth: 400, textAlign: 'center' }}>
            仅支持 .docx 格式的预览和编辑，旧版 .doc 格式不受支持。请转换为 .docx 格式后重试。
          </span>
          <Button onClick={downloadFile}>下载原始文件</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {onSave && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span style={{ fontSize: 14, color: '#4d4d4d' }}>Word 文档编辑</span>
          </div>
          <div className={styles.toolbarRight}>
            <Button type="primary" loading={saving} disabled={!dirty} onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      )}
      <div className={styles.viewerArea}>
        <div
          ref={editorRef}
          className={styles.wordEditor}
          contentEditable={!!onSave}
          suppressContentEditableWarning
          onInput={() => setDirty(true)}
        />
      </div>
    </div>
  )
}