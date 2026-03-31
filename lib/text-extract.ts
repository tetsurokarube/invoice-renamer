import { ExtractedData } from './types'

/** pdfjs-dist でPDFの全テキストを抽出 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pages.push(content.items.map((it: any) => it.str ?? '').join('\n'))
  }
  return pages.join('\n')
}

// ---- パース関数群 ----

function parseAmount(text: string): string {
  const patterns = [
    /ご?請求[金額]{0,2}\s*[：:￥¥]?\s*([\d,]+)/,
    /お?支払[い]?[金額]{0,2}\s*[：:￥¥]?\s*([\d,]+)/,
    /合計[金額]?\s*[：:￥¥]?\s*([\d,]+)/,
    /総[合計額]\s*[：:￥¥]?\s*([\d,]+)/,
    /[￥¥]([\d,]+)\s*[-（(]?税込/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1].replace(/,/g, '')
  }
  return ''
}

function toIsoDate(y: string, mo: string, d: string): string {
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function findDateNear(text: string, keywords: string[]): string {
  for (const kw of keywords) {
    const idx = text.indexOf(kw)
    if (idx === -1) continue
    const nearby = text.slice(idx, idx + 60)

    // 西暦
    let m = nearby.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/)
    if (m) return toIsoDate(m[1], m[2], m[3])

    // 令和
    m = nearby.match(/令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
    if (m) return toIsoDate(String(2018 + parseInt(m[1])), m[2], m[3])
  }
  // フォールバック：テキスト全体の最初の日付
  const m = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/)
  if (m) return toIsoDate(m[1], m[2], m[3])
  return ''
}

function parseCompanyName(text: string): string {
  // 宛先（御中・様 の前）を除外リストに
  const recipients = new Set<string>()
  const recipRe = /([^\n]{1,30}?)(御中|様)\s/g
  let m: RegExpExecArray | null
  while ((m = recipRe.exec(text)) !== null) recipients.add(m[1].trim())

  const isRecipient = (name: string) =>
    [...recipients].some((r) => name.includes(r) || r.includes(name))

  // 会社名パターン（前置き・後置き両方）
  const patterns = [
    /(株式会社[^\s\n、。,]{1,20})/g,
    /([^\s\n、。,]{1,20}株式会社)/g,
    /(合同会社[^\s\n、。,]{1,20})/g,
    /([^\s\n、。,]{1,20}合同会社)/g,
    /(有限会社[^\s\n、。,]{1,20})/g,
    /([^\s\n、。,]{1,20}有限会社)/g,
    /(一般社団法人[^\s\n、。,]{1,20})/g,
  ]
  for (const pat of patterns) {
    pat.lastIndex = 0
    while ((m = pat.exec(text)) !== null) {
      const name = m[1].trim()
      if (!isRecipient(name)) return name
    }
  }
  return ''
}

function parseInvoiceNumber(text: string): string {
  const patterns = [
    /請求書\s*No[.．]?\s*[：:]?\s*([A-Za-z0-9\-_]+)/,
    /請求番号\s*[：:]?\s*([A-Za-z0-9\-_]+)/,
    /Invoice\s*No[.．]?\s*[：:]?\s*([A-Za-z0-9\-_]+)/i,
    /(T\d{13})/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1] || m[0]
  }
  return ''
}

/** 抽出済みテキストから請求書フィールドをパース */
export function parseInvoiceText(text: string): ExtractedData {
  return {
    取引先名: parseCompanyName(text),
    請求日: findDateNear(text, ['請求日', '発行日', '作成日', '請求書日付']),
    支払期日: findDateNear(text, ['支払期限', '支払期日', 'お支払期限', 'お支払い期限', '振込期限', '入金期限']),
    請求金額: parseAmount(text),
    請求書番号: parseInvoiceNumber(text),
  }
}

/** PDFテキスト直接抽出のエントリポイント */
export async function extractFromPdfText(file: File): Promise<ExtractedData> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    throw new Error('テキスト直接抽出はPDFのみ対応しています。画像はGemini/GrokまたはVision APIをご利用ください。')
  }
  const text = await extractTextFromPdf(file)
  if (!text.trim()) {
    throw new Error('PDFにテキストレイヤーがありません（スキャンPDFの可能性）。Vision APIまたはAIプロバイダーをお使いください。')
  }
  return parseInvoiceText(text)
}
