export interface ExtractedData {
  取引先名: string
  請求日: string
  支払期日: string
  請求金額: string
  請求書番号: string
}

export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'error'

export interface ProcessingItem {
  id: string
  file: File
  originalName: string
  extractedData: ExtractedData | null
  newName: string
  status: ProcessingStatus
  error?: string
}

export interface HistoryRecord {
  id: string
  originalName: string
  newName: string
  extractedData: ExtractedData
  processedAt: string
}

export interface Settings {
  geminiApiKey: string
  namingTemplate: string
}

export interface ManualInputs {
  請求月: string   // mm (例: 02)
  請求年月: string // yymm (例: 2602)
}

export const TEMPLATE_VARIABLES = [
  { key: '{取引先名}', label: '取引先名', source: 'ocr' },
  { key: '{請求日}', label: '請求日', source: 'ocr' },
  { key: '{支払期日}', label: '支払期日', source: 'ocr' },
  { key: '{請求金額}', label: '請求金額', source: 'ocr' },
  { key: '{請求書番号}', label: '請求書番号', source: 'ocr' },
  { key: '{請求月}', label: '請求月', source: 'manual' },
  { key: '{請求年月}', label: '請求年月', source: 'manual' },
  { key: '{処理日}', label: '処理日', source: 'auto' },
  { key: '{連番}', label: '連番', source: 'auto' },
] as const

export const DEFAULT_TEMPLATE = '{請求年月}_{取引先名}_{請求月}月請求書'
