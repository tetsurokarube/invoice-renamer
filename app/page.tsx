'use client'

import { useState, useEffect, useCallback } from 'react'
import JSZip from 'jszip'
import FileDropzone from '@/components/FileDropzone'
import PreviewTable from '@/components/PreviewTable'
import { ProcessingItem, ExtractedData, ManualInputs, HistoryRecord } from '@/lib/types'
import { extractInvoiceData } from '@/lib/gemini'
import { applyTemplate } from '@/lib/naming'
import { getSettings, addHistoryRecords } from '@/lib/storage'

function generateId() {
  return Math.random().toString(36).slice(2)
}

function getFileExtension(filename: string) {
  return filename.includes('.') ? '.' + filename.split('.').pop()! : ''
}

export default function DashboardPage() {
  const [items, setItems] = useState<ProcessingItem[]>([])
  const [manualInputs, setManualInputs] = useState<ManualInputs>({
    請求月: '',
    請求年月: '',
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiKey, setApiKeyState] = useState('')
  const [template, setTemplate] = useState('')

  useEffect(() => {
    const s = getSettings()
    setApiKeyState(s.geminiApiKey)
    setTemplate(s.namingTemplate)

    // 今月をデフォルト入力
    const now = new Date()
    const yy = String(now.getFullYear()).slice(2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    setManualInputs({ 請求月: mm, 請求年月: yy + mm })
  }, [])

  const handleFilesAdded = useCallback((files: File[]) => {
    const newItems: ProcessingItem[] = files.map((file) => ({
      id: generateId(),
      file,
      originalName: file.name,
      extractedData: null,
      newName: '',
      status: 'pending',
    }))
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const handleUpdateExtracted = useCallback(
    (id: string, data: ExtractedData) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          const newName = applyTemplate(template, data, manualInputs, prev.indexOf(item))
          return { ...item, extractedData: data, newName: newName + getFileExtension(item.originalName) }
        })
      )
    },
    [template, manualInputs]
  )

  const handleProcess = async () => {
    if (!apiKey) {
      alert('設定画面でGemini APIキーを入力してください。')
      return
    }
    const pending = items.filter((i) => i.status === 'pending')
    if (pending.length === 0) return

    setIsProcessing(true)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.status !== 'pending') continue

      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'processing' } : it))
      )

      try {
        const extracted = await extractInvoiceData(item.file, apiKey)
        const doneItems = items.filter((_, idx) => idx < i && items[idx].status === 'done')
        const newName =
          applyTemplate(template, extracted, manualInputs, doneItems.length) +
          getFileExtension(item.originalName)

        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'done', extractedData: extracted, newName } : it
          )
        )
      } catch (err) {
        const error = err instanceof Error ? err.message : 'エラーが発生しました'
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'error', error } : it))
        )
      }
    }

    setIsProcessing(false)
  }

  const handleDownload = async () => {
    const doneItems = items.filter((i) => i.status === 'done')
    if (doneItems.length === 0) return

    const zip = new JSZip()
    for (const item of doneItems) {
      const arrayBuffer = await item.file.arrayBuffer()
      zip.file(item.newName, arrayBuffer)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'renamed_invoices.zip'
    a.click()
    URL.revokeObjectURL(url)

    // 履歴保存
    const records: HistoryRecord[] = doneItems
      .filter((i) => i.extractedData)
      .map((i) => ({
        id: generateId(),
        originalName: i.originalName,
        newName: i.newName,
        extractedData: i.extractedData!,
        processedAt: new Date().toISOString(),
      }))
    addHistoryRecords(records)
  }

  const handleClear = () => {
    setItems([])
  }

  const doneCount = items.filter((i) => i.status === 'done').length
  const pendingCount = items.filter((i) => i.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">請求書リネーム処理</h1>
        <p className="text-sm text-gray-500 mt-1">請求書をアップロードしてGemini AIで自動リネームします</p>
      </div>

      {!apiKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          ⚠️ Gemini APIキーが未設定です。<a href="/settings" className="underline font-medium">設定画面</a>から入力してください。
        </div>
      )}

      {/* 手動入力 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">手動入力（バッチ共通）</h2>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">請求年月（yymm）</label>
            <input
              type="text"
              value={manualInputs.請求年月}
              onChange={(e) => setManualInputs((p) => ({ ...p, 請求年月: e.target.value }))}
              placeholder="例: 2602"
              maxLength={4}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">請求月（mm）</label>
            <input
              type="text"
              value={manualInputs.請求月}
              onChange={(e) => setManualInputs((p) => ({ ...p, 請求月: e.target.value }))}
              placeholder="例: 02"
              maxLength={2}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 rounded px-3 py-1.5 text-xs text-gray-500">
              テンプレート：<span className="font-mono text-gray-700">{template || '（未設定）'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ドロップゾーン */}
      <FileDropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} />

      {/* テーブル */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {items.length}件 {doneCount > 0 && `（完了: ${doneCount}件）`}
            </span>
            <button
              onClick={handleClear}
              disabled={isProcessing}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              クリア
            </button>
          </div>
          <PreviewTable items={items} onUpdateExtracted={handleUpdateExtracted} />
        </div>
      )}

      {/* アクションボタン */}
      {items.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={handleProcess}
            disabled={isProcessing || pendingCount === 0}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? '処理中...' : `OCR処理（${pendingCount}件）`}
          </button>
          {doneCount > 0 && (
            <button
              onClick={handleDownload}
              disabled={isProcessing}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              ZIPダウンロード（{doneCount}件）
            </button>
          )}
        </div>
      )}
    </div>
  )
}
