import { ExtractedData, CompanyNameRegion } from './types'

interface TextItem {
  str: string
  x: number  // ページ左端からの距離
  y: number  // ページ上端からの距離（正規化 0〜1）
  xRatio: number  // ページ幅に対する比率 0〜1
  yRatio: number  // ページ高さに対する比率（上=0, 下=1）
}

async function getPdfjsLib() {
  const lib = await import('pdfjs-dist')
  lib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`
  return lib
}

/** PDFの1ページ目からテキストアイテム（座標付き）を取得 */
async function getTextItems(file: File): Promise<{ items: TextItem[]; pageWidth: number; pageHeight: number }> {
  const pdfjsLib = await getPdfjsLib()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()

  const items: TextItem[] = content.items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((it: any) => it.str?.trim())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((it: any) => {
      const x = it.transform[4]
      const yFromBottom = it.transform[5]
      const yFromTop = viewport.height - yFromBottom
      return {
        str: it.str,
        x,
        y: yFromTop,
        xRatio: x / viewport.width,
        yRatio: yFromTop / viewport.height,
      }
    })

  return { items, pageWidth: viewport.width, pageHeight: viewport.height }
}

/** 全ページのテキストを結合（金額・日付抽出用） */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await getPdfjsLib()
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

/** 指定領域のテキストアイテムを絞り込む */
function filterByRegion(items: TextItem[], region: CompanyNameRegion): TextItem[] {
  switch (region) {
    case 'top-right': return items.filter((i) => i.xRatio > 0.5 && i.yRatio < 0.45)
    case 'top-left':  return items.filter((i) => i.xRatio <= 0.5 && i.yRatio < 0.45)
    case 'top':       return items.filter((i) => i.yRatio < 0.45)
    case 'all':
    default:          return items
  }
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
    let m = nearby.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/)
    if (m) return toIsoDate(m[1], m[2], m[3])
    m = nearby.match(/令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
    if (m) return toIsoDate(String(2018 + parseInt(m[1])), m[2], m[3])
  }
  const m = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/)
  if (m) return toIsoDate(m[1], m[2], m[3])
  return ''
}

function parseCompanyNameFromText(text: string): string {
  const recipients = new Set<string>()
  const recipRe = /([^\n]{1,30}?)(御中|様)\s/g
  let m: RegExpExecArray | null
  while ((m = recipRe.exec(text)) !== null) recipients.add(m[1].trim())
  const isRecipient = (name: string) =>
    [...recipients].some((r) => name.includes(r) || r.includes(name))

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

export function parseInvoiceText(text: string): ExtractedData {
  return {
    取引先名: parseCompanyNameFromText(text),
    請求日: findDateNear(text, ['請求日', '発行日', '作成日', '請求書日付']),
    支払期日: findDateNear(text, ['支払期限', '支払期日', 'お支払期限', 'お支払い期限', '振込期限', '入金期限']),
    請求金額: parseAmount(text),
    請求書番号: parseInvoiceNumber(text),
  }
}

/** PDFテキスト直接抽出のエントリポイント */
export async function extractFromPdfText(
  file: File,
  companyNameRegion: CompanyNameRegion = 'top-right'
): Promise<ExtractedData> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    throw new Error('テキスト直接抽出はPDFのみ対応しています。画像はGemini/GrokまたはVision APIをご利用ください。')
  }

  // 座標付きアイテム取得（会社名用）
  const { items } = await getTextItems(file)
  if (items.length === 0) {
    throw new Error('PDFにテキストレイヤーがありません（スキャンPDFの可能性）。Vision APIまたはAIプロバイダーをお使いください。')
  }

  // 指定領域のテキストから会社名を抽出
  const regionItems = filterByRegion(items, companyNameRegion)
  const regionText = regionItems.map((i) => i.str).join('\n')
  const companyName = parseCompanyNameFromText(regionText)

  // 全文から金額・日付・番号を抽出
  const fullText = await extractTextFromPdf(file)
  const base = parseInvoiceText(fullText)

  return {
    ...base,
    // 領域指定で取れた場合はそちらを優先
    取引先名: companyName || base.取引先名,
  }
}
