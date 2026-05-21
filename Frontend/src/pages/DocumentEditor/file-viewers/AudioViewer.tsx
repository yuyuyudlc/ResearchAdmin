import { useMemo } from 'react'
import styles from './style.module.css'

interface Props {
  data: ArrayBuffer
  filename?: string
}

function getMimeType(filename?: string): string {
  const ext = filename?.toLowerCase().split('.').pop()
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'webm':
      return 'audio/webm'
    case 'wav':
      return 'audio/wav'
    case 'ogg':
      return 'audio/ogg'
    case 'aac':
      return 'audio/aac'
    case 'flac':
      return 'audio/flac'
    default:
      return 'audio/mpeg'
  }
}

export default function AudioViewer({ data, filename }: Props) {
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
            <span className={styles.mediaIcon}>♪</span>
            <span className={styles.mediaLabel}>音频文件</span>
            {filename && <span className={styles.mediaFilename}>{filename}</span>}
          </div>
          <audio controls className={styles.audioPlayer} src={blobUrl}>
            您的浏览器不支持音频播放
          </audio>
        </div>
      </div>
    </div>
  )
}