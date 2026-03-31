'use client'

import { ProcessingItem, ExtractedData } from '@/lib/types'

interface Props {
  items: ProcessingItem[]
  onUpdateExtracted: (id: string, data: ExtractedData) => void
}

const statusIcon: Record<string, string> = {
  pending: '⏳',
  processing: '🔄',
  done: '✅',
  error: '❌',
}

export default function PreviewTable({ items, onUpdateExtracted }: Props) {
  if (items.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-6"></th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">元ファイル名</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">取引先名</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">請求日</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">支払期日</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 min-w-48">新ファイル名</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 text-center">{statusIcon[item.status]}</td>
              <td className="px-3 py-2 text-gray-600 max-w-40 truncate" title={item.originalName}>
                {item.originalName}
              </td>
              <td className="px-3 py-2">
                {item.extractedData ? (
                  <input
                    type="text"
                    value={item.extractedData.取引先名}
                    onChange={(e) =>
                      onUpdateExtracted(item.id, {
                        ...item.extractedData!,
                        取引先名: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {item.extractedData ? (
                  <input
                    type="text"
                    value={item.extractedData.請求日}
                    onChange={(e) =>
                      onUpdateExtracted(item.id, {
                        ...item.extractedData!,
                        請求日: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {item.extractedData ? (
                  <input
                    type="text"
                    value={item.extractedData.支払期日}
                    onChange={(e) =>
                      onUpdateExtracted(item.id, {
                        ...item.extractedData!,
                        支払期日: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {item.status === 'error' ? (
                  <span className="text-red-500 text-xs">{item.error}</span>
                ) : item.newName ? (
                  <span className="font-mono text-xs text-blue-700">{item.newName}</span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
