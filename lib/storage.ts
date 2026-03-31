import { HistoryRecord, Settings, DEFAULT_TEMPLATE, DEFAULT_GEMINI_MODEL, DEFAULT_GROK_MODEL } from './types'

const KEYS = {
  settings: 'invoice-renamer:settings',
  history: 'invoice-renamer:history',
}

const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: DEFAULT_GEMINI_MODEL,
  grokApiKey: '',
  grokModel: DEFAULT_GROK_MODEL,
  namingTemplate: DEFAULT_TEMPLATE,
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEYS.settings)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}

export function getHistory(): HistoryRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEYS.history)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function addHistoryRecords(records: HistoryRecord[]): void {
  const existing = getHistory()
  const updated = [...records, ...existing].slice(0, 500)
  localStorage.setItem(KEYS.history, JSON.stringify(updated))
}

export function clearHistory(): void {
  localStorage.removeItem(KEYS.history)
}
