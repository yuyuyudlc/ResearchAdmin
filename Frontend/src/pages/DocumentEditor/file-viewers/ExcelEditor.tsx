import { useEffect, useState, startTransition } from 'react'
import { App, Button, Select } from 'antd'
import * as XLSX from 'xlsx'
import styles from './style.module.css'

interface Props {
  data: ArrayBuffer
  onSave?: (data: Uint8Array) => Promise<void>
  saving?: boolean
}

interface SheetData {
  name: string
  rows: string[][]
  cols: number
}

const getCellKey = (row: number, col: number) => `${row}_${col}`

export default function ExcelEditor({ data, onSave, saving }: Props) {
  const { message } = App.useApp()
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const wb = XLSX.read(data, { type: 'array' })
      const allSheets: SheetData[] = wb.SheetNames.map((name) => {
        const ws = wb.Sheets[name]
        const rows: string[][] = []
        const ref = ws['!ref']
        if (ref) {
          const range = XLSX.utils.decode_range(ref)
          for (let r = range.s.r; r <= range.e.r; r++) {
            const row: string[] = []
            for (let c = range.s.c; c <= range.e.c; c++) {
              const addr = XLSX.utils.encode_cell({ r, c })
              const cell = ws[addr]
              row.push(cell ? String(cell.v ?? '') : '')
            }
            rows.push(row)
          }
        }
        return { name, rows, cols: rows[0]?.length || 0 }
      })
      startTransition(() => {
        setSheets(allSheets)
      })
    } catch {
      message.error('无法解析 Excel 文档')
    } finally {
      startTransition(() => {
        setLoading(false)
      })
    }
  }, [data, message])

  const handleCellChange = (row: number, col: number, value: string) => {
    setEdits((prev) => ({ ...prev, [getCellKey(row, col)]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!onSave) return
    try {
      const wb = XLSX.utils.book_new()
      for (const sheet of sheets) {
        const rows = sheet.rows.map((r, ri) =>
          r.map((cell, ci) => {
            const key = getCellKey(ri, ci)
            return edits[key] !== undefined ? edits[key] : cell
          })
        )
        const ws = XLSX.utils.aoa_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, sheet.name)
      }
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
      await onSave(new Uint8Array(buffer))
      setSheets((prev) =>
        prev.map((sheet) => ({
          ...sheet,
          rows: sheet.rows.map((r, ri) =>
            r.map((cell, ci) => {
              const key = getCellKey(ri, ci)
              return edits[key] !== undefined ? edits[key] : cell
            })
          ),
        }))
      )
      setEdits({})
      setDirty(false)
      message.success('文档已保存')
    } catch {
      message.error('保存失败')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.viewerArea} style={{ placeItems: 'center', display: 'grid' }}>
          <span>正在解析 Excel 文档...</span>
        </div>
      </div>
    )
  }

  const current = sheets[activeSheet]
  if (!current) {
    return (
      <div className={styles.container}>
        <div className={styles.viewerArea} style={{ placeItems: 'center', display: 'grid' }}>
          <span>空的 Excel 文档</span>
        </div>
      </div>
    )
  }

  const colLabels = Array.from({ length: current.cols }, (_, i) =>
    XLSX.utils.encode_col(i)
  )

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Select
            value={activeSheet}
            onChange={(v) => setActiveSheet(v)}
            options={sheets.map((s, i) => ({ value: i, label: s.name }))}
            style={{ width: 160 }}
          />
          <span style={{ fontSize: 13, color: '#888' }}>
            {current.rows.length} 行 × {current.cols} 列
          </span>
        </div>
        <div className={styles.toolbarRight}>
          {onSave && (
            <Button type="primary" loading={saving} disabled={!dirty} onClick={handleSave}>
              保存
            </Button>
          )}
        </div>
      </div>
      <div className={styles.viewerArea}>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className={styles.excelTable}>
            <thead>
              <tr>
                <th style={{ minWidth: 40, background: '#fafafa' }}></th>
                {colLabels.map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.rows.map((row, ri) => (
                <tr key={ri}>
                  <td style={{ background: '#fafafa', textAlign: 'center', fontWeight: 500, minWidth: 40 }}>
                    {ri + 1}
                  </td>
                  {row.map((cell, ci) => {
                    const key = getCellKey(ri, ci)
                    const val = edits[key] !== undefined ? edits[key] : cell
                    return (
                      <td
                        key={ci}
                        contentEditable={!!onSave}
                        suppressContentEditableWarning
                        onInput={() => setDirty(true)}
                        onBlur={(e) => handleCellChange(ri, ci, e.currentTarget.textContent || '')}
                      >
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}