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
  const parts = filename.split('.')
  return parts.length > 1 ? '.' + parts.pop()! : ''
}

function downloadFile(file: File, newName: string) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = newName
  a.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const [items, setItems] = useState<ProcessingItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [manualInputs, setManualInputs] = useState<ManualInputs>({ 請求月: '', 請求年月: '' })
  const [isProcessing, setIsProcessing] = useState(false)
  const [apiKey, setApiKeyState] = useState('')
  const [template, setTemplate] = useState('')
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash-lite')

  useEffect(() => {
    const s = getSettings()
    setApiKeyState(s.geminiApiKey)
    setTemplate(s.namingTemplate)
    setGeminiModel(s.geminiModel)
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
        prev.map((item, idx) => {
          if (item.id !== id) return item
          const newName = applyTemplate(template, data, manualInputs, idx) + getFileExtension(item.originalName)
          return { ...item, extractedData: data, newName }
        })
      )
    },
    [template, manualInputs]
  )

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleToggleSelectAll = () => {
    const doneIds = items.filter((i) => i.status === 'done').map((i) => i.id)
    const allSelected = doneIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(doneIds))
    }
  }

  const handleDownloadOne = (item: ProcessingItem) => {
    downloadFile(item.file, item.newName)
    // 履歴保存
    if (item.extractedData) {
      addHistoryRecords([{
        id: generateId(),
        originalName: item.originalName,
        newName: item.newName,
        extractedData: item.extractedData,
        processedAt: new Date().toISOString(),
      }])
    }
  }

  const handleDownloadSelected = async () => {
    const targets = items.filter((i) => selectedIds.has(i.id) && i.status === 'done')
    if (targets.length === 0) return

    if (targets.length === 1) {
      handleDownloadOne(targets[0])
      return
    }

    const zip = new JSZip()
    for (const item of targets) {
      zip.file(item.newName, await item.file.arrayBuffer())
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'renamed_invoices.zip'
    a.click()
    URL.revokeObjectURL(url)

    const records: HistoryRecord[] = targets
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

  const handleProcess = async () => {
    if (!apiKey) {
      alert('設定画面でGemini APIキーを入力してください。')
      return
    }
    const pendingItems = items.filter((i) => i.status === 'pending')
    if (pendingItems.length === 0) return

    setIsProcessing(true)
    let doneCount = items.filter((i) => i.status === 'done').length

    for (const item of pendingItems) {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'processing' } : it))
      )
      try {
        const extracted = await extractInvoiceData(item.file, apiKey, geminiModel)
        const newName = applyTemplate(template, extracted, manualInputs, doneCount) + getFileExtension(item.originalName)
        doneCount++
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'done', extractedData: extracted, newName } : it
          )
        )
        setSelectedIds((prev) => new Set([...prev, item.id]))
      } catch (err) {
        const error = err instanceof Error ? err.message : 'エラーが発生しました'
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'error', error } : it))
        )
      }
    }
    setIsProcessing(false)
  }

  const handleClear = () => {
    setItems([])
    setSelectedIds(new Set())
  }

  const pendingCount = items.filter((i) => i.status === 'pending').length
  const doneCount = items.filter((i) => i.status === 'done').length
  const selectedDoneCount = items.filter((i) => selectedIds.has(i.id) && i.status === 'done').length

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
        <div className="flex gap-4 flex-wrap items-end">
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
          <div className="bg-gray-50 rounded px-3 py-1.5 text-xs text-gray-500">
            テンプレート：<span className="font-mono text-gray-700">{template || '（未設定）'}</span>
          </div>
        </div>
      </div>

      {/* ドロップゾーン */}
      <FileDropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} />

      {/* テーブル＋アクション */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">
              {items.length}件
              {doneCount > 0 && <span className="text-gray-400 ml-2">（完了: {doneCount}件）</span>}
            </span>
            <div className="flex items-center gap-2">
              {selectedDoneCount > 0 && (
                <button
                  onClick={handleDownloadSelected}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  選択をダウンロード（{selectedDoneCount}件）
                </button>
              )}
              <button
                onClick={handleProcess}
                disabled={isProcessing || pendingCount === 0}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? '処理中...' : `OCR処理（${pendingCount}件）`}
              </button>
              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2"
              >
                クリア
              </button>
            </div>
          </div>
          <PreviewTable
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onUpdateExtracted={handleUpdateExtracted}
            onDownloadOne={handleDownloadOne}
          />
        </div>
      )}
    </div>
  )
}
