'use client'

import { useState, useEffect } from 'react'
import { getHistory, clearHistory } from '@/lib/storage'
import { HistoryRecord } from '@/lib/types'

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([])

  useEffect(() => {
    setRecords(getHistory())
  }, [])

  const handleClear = () => {
    if (!confirm('履歴をすべて削除しますか？')) return
    clearHistory()
    setRecords([])
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">処理履歴</h1>
          <p className="text-sm text-gray-500 mt-1">{records.length}件（最大500件）</p>
        </div>
        {records.length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            履歴を削除
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">まだ処理履歴がありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">処理日時</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">元ファイル名</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">新ファイル名</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">取引先名</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">請求金額</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.processedAt)}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-40 truncate" title={r.originalName}>{r.originalName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-blue-700 max-w-48 truncate" title={r.newName}>{r.newName}</td>
                    <td className="px-3 py-2 text-gray-700">{r.extractedData.取引先名 || '-'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {r.extractedData.請求金額
                        ? `¥${Number(r.extractedData.請求金額).toLocaleString()}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
