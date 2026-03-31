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

// --- Provider ---
export type OcrProvider = 'text' | 'vision' | 'gemini' | 'grok'

export const OCR_PROVIDERS = [
  { id: 'text',   label: 'テキスト直接抽出', desc: '完全無料・デジタルPDFのみ' },
  { id: 'vision', label: 'Google Cloud Vision', desc: '月1,000回無料・画像/スキャンPDF対応' },
  { id: 'gemini', label: 'Google Gemini',  desc: 'AI・高精度' },
  { id: 'grok',   label: 'xAI Grok',       desc: 'AI・高精度' },
] as const

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite（推奨・無料枠大）' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash（高精度）' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B（軽量）' },
] as const

export const GROK_MODELS = [
  { id: 'grok-2-vision-1212', label: 'Grok 2 Vision（推奨）' },
] as const

export type GeminiModelId = typeof GEMINI_MODELS[number]['id']
export type GrokModelId = typeof GROK_MODELS[number]['id']

export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-2.0-flash-lite'
export const DEFAULT_GROK_MODEL: GrokModelId = 'grok-2-vision-1212'
/** @deprecated use DEFAULT_GEMINI_MODEL */
export const DEFAULT_MODEL = DEFAULT_GEMINI_MODEL

export interface Settings {
  provider: OcrProvider
  geminiApiKey: string
  geminiModel: GeminiModelId
  grokApiKey: string
  grokModel: GrokModelId
  visionApiKey: string
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
