import PdfViewer from './PdfViewer'
import WordEditor from './WordEditor'
import ExcelEditor from './ExcelEditor'
import PptxViewer from './PptxViewer'

export type FileBodyType = 'pdf' | 'word' | 'excel' | 'ppt'

export function inferBodyType(filename: string): FileBodyType | null {
  const ext = filename?.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'doc':
    case 'docx':
      return 'word'
    case 'xls':
    case 'xlsx':
      return 'excel'
    case 'ppt':
    case 'pptx':
      return 'ppt'
    default:
      return null
  }
}

export { PdfViewer, WordEditor, ExcelEditor, PptxViewer }