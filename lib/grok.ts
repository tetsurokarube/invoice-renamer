import OpenAI from 'openai'
import { ExtractedData } from './types'
import { pdfFirstPageToBase64 } from './pdf-to-image'

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRetryDelay(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err)
  const match = msg.match(/retry.*?(\d+)s/i)
  return match ? parseInt(match[1]) + 2 : 30
}

async function fileToBase64Image(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    return pdfFirstPageToBase64(file)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractWithGrok(
  file: File,
  apiKey: string,
  modelId = 'grok-2-vision-1212',
  maxRetries = 2
): Promise<ExtractedData> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
    dangerouslyAllowBrowser: true,
  })

  const base64 = await fileToBase64Image(file)

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACTION_PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 512,
      })

      const text = response.choices[0]?.message?.content?.trim() ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('GrokからJSONを取得できませんでした')

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
      if ((msg.includes('429') || msg.includes('rate')) && attempt < maxRetries) {
        await sleep(parseRetryDelay(err) * 1000)
        continue
      }
      throw err
    }
  }
  throw lastError
}
