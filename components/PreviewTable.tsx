'use client'

import { ProcessingItem, ExtractedData } from '@/lib/types'

interface Props {
  items: ProcessingItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onUpdateExtracted: (id: string, data: ExtractedData) => void
  onDownloadOne: (item: ProcessingItem) => void
}

const statusIcon: Record<string, string> = {
  pending: '⏳',
  processing: '🔄',
  done: '✅',
  error: '❌',
}

export default function PreviewTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateExtracted,
  onDownloadOne,
}: Props) {
  if (items.length === 0) return null

  const doneItems = items.filter((i) => i.status === 'done')
  const allDoneSelected = doneItems.length > 0 && doneItems.every((i) => selectedIds.has(i.id))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 w-8">
              <input
                type="checkbox"
                checked={allDoneSelected}
                onChange={onToggleSelectAll}
                className="rounded"
                title="完了済みをすべて選択"
              />
            </th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-6"></th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">元ファイル名</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">取引先名</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">請求日</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 min-w-48">新ファイル名</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={`border-b border-gray-100 ${
                selectedIds.has(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <td className="px-3 py-2 text-center">
                {item.status === 'done' && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelect(item.id)}
                    className="rounded"
                  />
                )}
              </td>
              <td className="px-3 py-2 text-center">{statusIcon[item.status]}</td>
              <td className="px-3 py-2 text-gray-600 max-w-36 truncate" title={item.originalName}>
                {item.originalName}
              </td>
              <td className="px-3 py-2">
                {item.extractedData ? (
                  <input
                    type="text"
                    value={item.extractedData.取引先名}
                    onChange={(e) =>
                      onUpdateExtracted(item.id, { ...item.extractedData!, 取引先名: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {item.extractedData ? (
                  <input
                    type="text"
                    value={item.extractedData.請求日}
                    onChange={(e) =>
                      onUpdateExtracted(item.id, { ...item.extractedData!, 請求日: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {item.status === 'error' ? (
                  <span className="text-red-500 text-xs">{item.error}</span>
                ) : item.newName ? (
                  <span className="font-mono text-xs text-blue-700">{item.newName}</span>
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {item.status === 'done' && (
                  <button
                    onClick={() => onDownloadOne(item)}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors whitespace-nowrap"
                  >
                    DL
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
