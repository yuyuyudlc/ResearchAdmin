import { useEffect, useRef, useState, startTransition } from 'react'
import { Spin, Button } from 'antd'
import { init } from 'pptx-preview'
import JSZip from 'jszip'
import styles from './style.module.css'

interface Props {
  data: ArrayBuffer
  filename?: string
}

function isZipFormat(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false
  const header = new Uint8Array(buf.slice(0, 4))
  return header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04
}

interface SlideContent {
  index: number
  texts: string[]
}

function parsePptxText(data: ArrayBuffer): Promise<SlideContent[]> {
  return JSZip.loadAsync(data).then(async (zip) => {
    const presXml = await zip.file('ppt/presentation.xml')?.async('text')
    if (!presXml) throw new Error('无法解析 PPTX 结构')

    const slideRels: string[] = []
    const parser = new DOMParser()
    const presDoc = parser.parseFromString(presXml, 'text/xml')

    const slideIds = presDoc.querySelectorAll('p\\:sldId, sldId')
    slideIds.forEach((el) => {
      const id = el.getAttribute('r:id') || el.getAttribute('id')
      if (id) slideRels.push(id)
    })

    const relsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text')
    if (!relsXml) throw new Error('无法解析 PPTX 关系')

    const relsDoc = parser.parseFromString(relsXml, 'text/xml')
    const relMap = new Map<string, string>()
    relsDoc.querySelectorAll('Relationship').forEach((el) => {
      const id = el.getAttribute('Id')
      const target = el.getAttribute('Target')
      if (id && target) relMap.set(id, target)
    })

    const slides: SlideContent[] = []
    for (const relId of slideRels) {
      const target = relMap.get(relId)
      if (!target) continue

      const slidePath = target.startsWith('/') ? target.slice(1) : `ppt/${target}`
      const slideXml = await zip.file(slidePath)?.async('text')
      if (!slideXml) continue

      const slideDoc = parser.parseFromString(slideXml, 'text/xml')
      const texts: string[] = []
      const tElements = slideDoc.querySelectorAll('a\\:t, t')
      tElements.forEach((el) => {
        const t = el.textContent?.trim()
        if (t) texts.push(t)
      })

      slides.push({ index: slides.length + 1, texts })
    }

    return slides
  })
}

export default function PptxViewer({ data, filename }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fallbackSlides, setFallbackSlides] = useState<SlideContent[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showFallback, setShowFallback] = useState(false)

  const downloadFile = () => {
    const blob = new Blob([data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'presentation.ppt'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!containerRef.current) return

    if (!isZipFormat(data)) {
      startTransition(() => {
        setShowFallback(true)
        setLoading(false)
        setError('仅支持 .pptx 格式预览，旧版 .ppt 格式不受支持')
      })
      return
    }

    const wrapper = containerRef.current
    wrapper.innerHTML = ''
    startTransition(() => {
      setShowFallback(false)
      setError('')
      setLoading(true)
      setFallbackSlides([])
      setCurrentSlide(0)
    })

    let cancelled = false

    const loadFallback = async () => {
      try {
        const slides = await parsePptxText(data)
        if (!cancelled) {
          startTransition(() => {
            setFallbackSlides(slides)
          })
        }
      } catch {
        // fallback parsing failed, will rely on pptx-preview or show error
      }
    }

    loadFallback()

    try {
      const viewer = init(wrapper, {
        width: 960,
        height: 540,
      })

      const result = viewer.preview(data)

      const done = () => {
        if (!cancelled) {
          startTransition(() => {
            // Check if pptx-preview actually rendered anything
            if (wrapper.children.length === 0 || wrapper.innerHTML.trim() === '') {
              setShowFallback(true)
            }
            setLoading(false)
          })
        }
      }

      const failed = () => {
        if (!cancelled) {
          startTransition(() => {
            setShowFallback(true)
            setLoading(false)
          })
        }
      }

      if (result && typeof result.then === 'function') {
        result.then(done).catch(failed)
      } else {
        done()
      }
    } catch {
      if (!cancelled) {
        startTransition(() => {
          setShowFallback(true)
          setLoading(false)
        })
      }
    }

    return () => {
      cancelled = true
    }
  }, [data])

  const slide = fallbackSlides[currentSlide]

  return (
    <div className={styles.container}>
      <div className={styles.viewerArea} style={{ position: 'relative', minHeight: 400 }}>
        <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#fafafa' }}>
            <Spin tip="正在解析 PowerPoint..." />
          </div>
        )}
        {!loading && error && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#fafafa' }}>
            <span style={{ color: '#ee0000' }}>{error}</span>
          </div>
        )}
        {!loading && showFallback && fallbackSlides.length > 0 && (
          <div style={{ width: '100%' }}>
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                <span style={{ fontSize: 14, color: '#4d4d4d' }}>
                  PowerPoint 文档（共 {fallbackSlides.length} 页）
                </span>
              </div>
              <div className={styles.toolbarRight}>
                <Button disabled={currentSlide <= 0} onClick={() => setCurrentSlide((i) => i - 1)}>
                  上一页
                </Button>
                <span style={{ margin: '0 12px', fontSize: 13, color: '#888' }}>
                  {currentSlide + 1} / {fallbackSlides.length}
                </span>
                <Button disabled={currentSlide >= fallbackSlides.length - 1} onClick={() => setCurrentSlide((i) => i + 1)}>
                  下一页
                </Button>
              </div>
            </div>
            <div className={styles.slidePage}>
              {slide ? (
                slide.texts.map((t, i) => (
                  <p key={i} className={styles.slideText}>{t}</p>
                ))
              ) : (
                <span style={{ color: '#999' }}>（空页）</span>
              )}
            </div>
          </div>
        )}
        {!loading && showFallback && fallbackSlides.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#fafafa', alignContent: 'center', gap: 16 }}>
            <span style={{ color: '#ee0000', fontSize: 16 }}>无法预览 PowerPoint 文档</span>
            {error && <span style={{ fontSize: 13, color: '#888', maxWidth: 400, textAlign: 'center' }}>{error}</span>}
            <Button onClick={downloadFile}>下载原始文件</Button>
          </div>
        )}
      </div>
    </div>
  )
}