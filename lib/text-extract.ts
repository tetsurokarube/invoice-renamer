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

/** 全文から受取人（御中/様付きの名前）を抽出 */
function extractRecipients(text: string): Set<string> {
  const recipients = new Set<string>()
  const re = /([^\n]{1,30}?)(御中|様)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim()
    if (name) recipients.add(name)
  }
  return recipients
}

/** 法人・個人名を1つのテキストから抽出（受取人除外あり） */
function extractNameFromText(text: string, recipients: Set<string>): string {
  const isRecipient = (name: string) =>
    [...recipients].some((r) => name.includes(r) || r.includes(name))

  // 法人パターン（前置き・後置き）
  const legalPatterns = [
    /(株式会社[^\s\n、。,（()[\]【】]{1,25})/,
    /([^\s\n、。,（()[\]【】]{1,25}株式会社)/,
    /(合同会社[^\s\n、。,（()[\]【】]{1,25})/,
    /([^\s\n、。,（()[\]【】]{1,25}合同会社)/,
    /(有限会社[^\s\n、。,（()[\]【】]{1,25})/,
    /([^\s\n、。,（()[\]【】]{1,25}有限会社)/,
    /(一般社団法人[^\s\n、。,（()[\]【】]{1,25})/,
    /(一般財団法人[^\s\n、。,（()[\]【】]{1,25})/,
    /(社会福祉法人[^\s\n、。,（()[\]【】]{1,25})/,
    /(医療法人[^\s\n、。,（()[\]【】]{1,25})/,
    /(学校法人[^\s\n、。,（()[\]【】]{1,25})/,
    /(特定非営利活動法人[^\s\n、。,（()[\]【】]{1,20})/,
    /(NPO法人[^\s\n、。,（()[\]【】]{1,20})/,
    /([^\s\n、。,（()[\]【】]{1,20}有限事業組合)/,
  ]

  for (const p of legalPatterns) {
    const m = text.match(p)
    if (m) {
      const name = m[1].trim()
      if (!isRecipient(name)) return name
    }
  }
  return ''
}

/** ノイズ行かどうかを判定（住所・電話・URL等） */
function isNoiseLine(s: string): boolean {
  return (
    s.length < 2 ||
    /^\d/.test(s) ||              // 数字始まり（番地・電話・金額）
    /^〒/.test(s) ||               // 郵便番号
    /@/.test(s) ||                 // メールアドレス
    /https?:/.test(s) ||           // URL
    /^(TEL|FAX|Tel|Fax|tel|fax)/.test(s) || // 電話/FAX
    /^(請求書|御請求書|見積書|納品書|領収書|発行日|請求日|担当|代表者名?|所在地|住所)/.test(s) || // 書類名・ラベル
    /^[ー\-–—\s]+$/.test(s)         // 区切り線のみ
  )
}

/**
 * 右上領域のアイテムから発行元（会社名または個人名）を抽出
 * 1. 法人名パターンを優先
 * 2. なければ上から順に走査してノイズでない最初の行を返す
 */
function parseIssuerFromItems(items: TextItem[], recipients: Set<string>): string {
  if (items.length === 0) return ''

  // 上→下、左→右の順にソート
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const regionText = sorted.map((i) => i.str).join('\n')

  // まず法人名パターンで試みる
  const byPattern = extractNameFromText(regionText, recipients)
  if (byPattern) return byPattern

  // パターン未ヒットの場合：上から走査してノイズでない最初の候補を返す
  const isRecipient = (name: string) =>
    [...recipients].some((r) => name.includes(r) || r.includes(name))

  for (const item of sorted) {
    const s = item.str.trim()
    if (isNoiseLine(s)) continue
    // 漢字・カナ・英数字を含む実質的なテキスト
    if (/[\u3040-\u30FF\u4E00-\u9FFF\uFF21-\uFF5AA-Za-z]/.test(s) && !isRecipient(s)) {
      return s
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

export function parseInvoiceText(text: string, recipients?: Set<string>): ExtractedData {
  const recip = recipients ?? extractRecipients(text)
  return {
    取引先名: extractNameFromText(text, recip),
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

  // 全文取得（金額・日付・番号 + 受取人判定に使用）
  const fullText = await extractTextFromPdf(file)

  // 全文から受取人を抽出（御中/様が付く宛先名）
  const recipients = extractRecipients(fullText)

  // 指定領域のアイテムから発行元名を抽出（受取人を除外）
  const regionItems = filterByRegion(items, companyNameRegion)
  const issuerName = parseIssuerFromItems(regionItems, recipients)

  // 全文から金額・日付・番号を抽出
  const base = parseInvoiceText(fullText, recipients)

  return {
    ...base,
    // 領域指定で取れた場合はそちらを優先
    取引先名: issuerName || base.取引先名,
  }
}
