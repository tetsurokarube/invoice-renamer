/**
 * PDFの1ページ目をJPEG base64画像に変換（Grok用）
 */
export async function pdfFirstPageToBase64(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')

  // CDNのワーカーを使用（Next.jsのpublic配置不要）
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)

  const scale = 2.0
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx as any, viewport, canvas }).promise

  // JPEG base64（data:... プレフィックスなし）
  return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
}
