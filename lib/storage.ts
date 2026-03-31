import { HistoryRecord, Settings, DEFAULT_TEMPLATE, DEFAULT_MODEL } from './types'

const KEYS = {
  settings: 'invoice-renamer:settings',
  history: 'invoice-renamer:history',
}

const DEFAULT_SETTINGS: Settings = { geminiApiKey: '', namingTemplate: DEFAULT_TEMPLATE, geminiModel: DEFAULT_MODEL }

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
  const updated = [...records, ...existing].slice(0, 500) // 最大500件
  localStorage.setItem(KEYS.history, JSON.stringify(updated))
}

export function clearHistory(): void {
  localStorage.removeItem(KEYS.history)
}
