import { useMemo } from 'react'
import styles from './style.module.css'

interface Props {
  data: ArrayBuffer
  filename?: string
}

function getMimeType(filename?: string): string {
  const ext = filename?.toLowerCase().split('.').pop()
  switch (ext) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
      return 'video/ogg'
    case 'mov':
      return 'video/quicktime'
    default:
      return 'video/mp4'
  }
}

export default function VideoViewer({ data, filename }: Props) {
  const blobUrl = useMemo(() => {
    const mime = getMimeType(filename)
    const blob = new Blob([data], { type: mime })
    return URL.createObjectURL(blob)
  }, [data, filename])

  return (
    <div className={styles.container}>
      <div className={styles.viewerArea}>
        <div className={styles.mediaContainer}>
          <div className={styles.mediaInfo}>
            <span className={styles.mediaIcon}>▶</span>
            <span className={styles.mediaLabel}>视频文件</span>
            {filename && <span className={styles.mediaFilename}>{filename}</span>}
          </div>
          <video controls className={styles.videoPlayer} src={blobUrl}>
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>
    </div>
  )
}