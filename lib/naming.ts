import { ExtractedData, ManualInputs } from './types'

function today(): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

// ファイル名に使えない文字を除去
function sanitize(str: string): string {
  return str.replace(/[\\/:*?"<>|]/g, '').trim()
}

export function applyTemplate(
  template: string,
  extracted: ExtractedData,
  manual: ManualInputs,
  index: number
): string {
  const replacements: Record<string, string> = {
    '{取引先名}': sanitize(extracted.取引先名),
    '{請求日}': sanitize(extracted.請求日),
    '{支払期日}': sanitize(extracted.支払期日),
    '{請求金額}': sanitize(extracted.請求金額),
    '{請求書番号}': sanitize(extracted.請求書番号),
    '{請求月}': manual.請求月,
    '{請求年月}': manual.請求年月,
    '{処理日}': today(),
    '{連番}': String(index + 1).padStart(2, '0'),
  }

  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value)
  }

  // 連続するアンダースコア・ハイフンを整理
  result = result.replace(/[_\-]{2,}/g, '_').replace(/^[_\-]+|[_\-]+$/g, '')

  return result
}

export function previewTemplate(
  template: string,
  manual: ManualInputs
): string {
  const sample: ExtractedData = {
    取引先名: '株式会社サンプル',
    請求日: '2026-02-28',
    支払期日: '2026-03-31',
    請求金額: '110000',
    請求書番号: 'INV-001',
  }
  return applyTemplate(template, sample, manual, 0)
}
