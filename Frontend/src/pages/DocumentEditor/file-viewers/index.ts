import PdfViewer from './PdfViewer'
import WordEditor from './WordEditor'
import ExcelEditor from './ExcelEditor'
import PptxViewer from './PptxViewer'
import AudioViewer from './AudioViewer'
import VideoViewer from './VideoViewer'
import DatasetViewer from './DatasetViewer'

export type FileBodyType = 'pdf' | 'word' | 'excel' | 'ppt' | 'audio' | 'video' | 'dataset'

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
    case 'mp3':
    case 'webm':
    case 'wav':
    case 'ogg':
    case 'aac':
    case 'flac':
      return 'audio'
    case 'mp4':
    case 'mov':
      return 'video'
    case 'csv':
    case 'tsv':
    case 'json':
    case 'jsonl':
      return 'dataset'
    default:
      return null
  }
}

export { PdfViewer, WordEditor, ExcelEditor, PptxViewer, AudioViewer, VideoViewer, DatasetViewer }