import { ExtractedData } from './types'
import { parseInvoiceText } from './text-extract'
import { pdfFirstPageToBase64 } from './pdf-to-image'

async function fileToBase64(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (isPdf) return pdfFirstPageToBase64(file)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractWithVision(
  file: File,
  apiKey: string
): Promise<ExtractedData> {
  const base64 = await fileToBase64(file)

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Vision APIエラー: ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const text: string = data.responses?.[0]?.fullTextAnnotation?.text ?? ''

  if (!text.trim()) {
    throw new Error('テキストを検出できませんでした（画像が不鮮明な可能性）')
  }

  return parseInvoiceText(text)
}
