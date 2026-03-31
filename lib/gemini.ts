import { GoogleGenerativeAI } from '@google/generative-ai'
import { ExtractedData } from './types'

const EXTRACTION_PROMPT = `この請求書画像から以下の情報をJSON形式で抽出してください。
情報が見つからない場合は空文字("")を返してください。

返却フォーマット（JSONのみ、説明文不要）:
{
  "取引先名": "請求書の発行元（請求してきた会社名・個人名）",
  "請求日": "請求書の発行日（YYYY-MM-DD形式）",
  "支払期日": "支払期限日（YYYY-MM-DD形式）",
  "請求金額": "税込合計金額（数字のみ、例: 110000）",
  "請求書番号": "請求書番号またはインボイス番号"
}`

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getMimeType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  }
  return mimeMap[ext || ''] || 'application/octet-stream'
}

// 429エラーから retryDelay（秒）を抽出する
function parseRetryDelay(error: unknown): number {
  const msg = error instanceof Error ? error.message : String(error)
  const match = msg.match(/retry.*?(\d+)s/i) || msg.match(/retryDelay.*?(\d+)/i)
  return match ? parseInt(match[1]) + 2 : 30
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function extractInvoiceData(
  file: File,
  apiKey: string,
  modelId = 'gemini-2.0-flash-lite',
  maxRetries = 2
): Promise<ExtractedData> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelId })
  const base64Data = await fileToBase64(file)
  const mimeType = getMimeType(file)

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent([
        EXTRACTION_PROMPT,
        { inlineData: { data: base64Data, mimeType } },
      ])

      const text = result.response.text().trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Gemini APIからJSONを取得できませんでした')

      const parsed = JSON.parse(jsonMatch[0])
      return {
        取引先名: parsed['取引先名'] || '',
        請求日: parsed['請求日'] || '',
        支払期日: parsed['支払期日'] || '',
        請求金額: parsed['請求金額'] || '',
        請求書番号: parsed['請求書番号'] || '',
      }
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)

      // 429: レート制限 → 待機してリトライ
      if (msg.includes('429') && attempt < maxRetries) {
        const delaySec = parseRetryDelay(err)
        console.warn(`429 rate limit. Waiting ${delaySec}s before retry ${attempt + 1}/${maxRetries}...`)
        await sleep(delaySec * 1000)
        continue
      }

      // quota limit: 0 → APIキーの問題なのでリトライ不要
      if (msg.includes('limit: 0')) {
        throw new Error(
          'APIキーの無料枠が無効です。Google AI Studio（aistudio.google.com）で「Create API key in new project」から新しいキーを作成してください。'
        )
      }

      throw err
    }
  }

  throw lastError
}
