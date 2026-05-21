import { useEffect, useRef } from 'react'
import styles from './style.module.css'

interface Props {
  data: ArrayBuffer
}

export default function PdfViewer({ data }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const blob = new Blob([data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    if (iframeRef.current) {
      iframeRef.current.src = url
    }
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [data])

  return (
    <div className={styles.container}>
      <div className={styles.pdfContainer}>
        <iframe
          ref={iframeRef}
          className={styles.pdfEmbed}
          title="PDF 预览"
        />
      </div>
    </div>
  )
}