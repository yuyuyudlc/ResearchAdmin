import { useEffect, useMemo, useState, startTransition } from 'react'
import { Table, Select, App } from 'antd'
import Papa from 'papaparse'
import styles from './style.module.css'

interface Props {
  data: ArrayBuffer
  filename?: string
}

type DatasetFormat = 'csv' | 'tsv' | 'json'

interface ParsedData {
  columns: { title: string; dataIndex: string; key: string; ellipsis: boolean }[]
  rows: Record<string, unknown>[]
  total: number
}

function detectFormat(filename?: string): DatasetFormat {
  const ext = filename?.toLowerCase().split('.').pop()
  switch (ext) {
    case 'tsv':
      return 'tsv'
    case 'json':
      return 'json'
    default:
      return 'csv'
  }
}

function formatDataSize(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} B`
  if (byteLength < 1024 * 1024) return `${(byteLength / 1024).toFixed(1)} KB`
  return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`
}

function parseCSV(text: string, delimiter: string): ParsedData {
  const result = Papa.parse(text, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  })

  const columns = result.meta.fields?.map((field) => ({
    title: field,
    dataIndex: field,
    key: field,
    ellipsis: true,
  })) || []

  const rows = result.data as Record<string, unknown>[]

  return { columns, rows, total: rows.length }
}

function parseJSON(text: string): ParsedData {
  let data: unknown[] = []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      data = parsed
    } else if (typeof parsed === 'object' && parsed !== null) {
      const possibleArr = Object.values(parsed as Record<string, unknown>)
      if (Array.isArray(possibleArr)) {
        data = possibleArr
      } else {
        data = [parsed]
      }
    }
  } catch {
    const lines = text.split('\n').filter((l) => l.trim())
    data = lines.map((line) => {
      try { return JSON.parse(line) } catch { return { value: line } }
    })
  }

  if (data.length === 0) {
    return { columns: [], rows: [], total: 0 }
  }

  const fields = new Set<string>()
  data.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item as Record<string, unknown>).forEach((k) => fields.add(k))
    }
  })

  const columns = Array.from(fields).map((field) => ({
    title: field,
    dataIndex: field,
    key: field,
    ellipsis: true,
  }))

  const rows = data.map((item, i) => {
    if (item && typeof item === 'object') {
      const row: Record<string, unknown> = { _key: i }
      Array.from(fields).forEach((field) => {
        row[field] = (item as Record<string, unknown>)[field] ?? ''
      })
      return row
    }
    return { _key: i, value: String(item) }
  })

  return { columns, rows, total: rows.length }
}

export default function DatasetViewer({ data, filename }: Props) {
  const { message } = App.useApp()
  const [format, setFormat] = useState<DatasetFormat>(detectFormat(filename))
  const [loading, setLoading] = useState(true)
  const [parsed, setParsed] = useState<ParsedData>({ columns: [], rows: [], total: 0 })
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    const f = detectFormat(filename)
    startTransition(() => {
      setFormat(f)
    })
  }, [filename])

  useEffect(() => {
    startTransition(() => {
      setLoading(true)
    })
    const textDecoder = new TextDecoder('utf-8')
    let text: string
    try {
      text = textDecoder.decode(data)
    } catch {
      message.error('无法解码文件内容')
      startTransition(() => {
        setLoading(false)
      })
      return
    }

    try {
      let result: ParsedData
      if (format === 'json') {
        result = parseJSON(text)
      } else {
        const delimiter = format === 'tsv' ? '\t' : ','
        result = parseCSV(text, delimiter)
      }
      startTransition(() => {
        setParsed(result)
        setLoading(false)
      })
    } catch {
      message.error('解析数据集失败')
      startTransition(() => {
        setLoading(false)
      })
    }
  }, [data, format, message])

  const dataSize = useMemo(() => formatDataSize(data.byteLength), [data])

  const handleFormatChange = (value: DatasetFormat) => {
    setFormat(value)
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Select
            value={format}
            onChange={handleFormatChange}
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'tsv', label: 'TSV' },
              { value: 'json', label: 'JSON' },
            ]}
            style={{ width: 100 }}
          />
          <span style={{ fontSize: 13, color: '#888' }}>
            {parsed.total} 行 × {parsed.columns.length} 列 · {dataSize}
          </span>
        </div>
      </div>
      <div className={styles.viewerArea} style={{ padding: 0 }}>
        <Table
          columns={parsed.columns}
          dataSource={parsed.rows}
          loading={loading}
          rowKey={(_, index) => String(index ?? 0)}
          scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
          size="small"
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            onShowSizeChange: (_current, size) => setPageSize(size),
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: parsed.columns.length === 0 && !loading ? '空数据集' : '暂无数据',
          }}
        />
      </div>
    </div>
  )
}