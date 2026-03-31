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
      // "data:...;base64," プレフィックスを除去
      const base64 = result.split(',')[1]
      resolve(base64)
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

export async function extractInvoiceData(
  file: File,
  apiKey: string
): Promise<ExtractedData> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const base64Data = await fileToBase64(file)
  const mimeType = getMimeType(file)

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    },
  ])

  const text = result.response.text().trim()

  // JSONブロックを抽出（```json ... ``` に囲まれている場合も対応）
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Gemini APIからJSONを取得できませんでした')
  }

  const parsed = JSON.parse(jsonMatch[0])

  return {
    取引先名: parsed['取引先名'] || '',
    請求日: parsed['請求日'] || '',
    支払期日: parsed['支払期日'] || '',
    請求金額: parsed['請求金額'] || '',
    請求書番号: parsed['請求書番号'] || '',
  }
}
