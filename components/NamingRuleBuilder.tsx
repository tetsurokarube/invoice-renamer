'use client'

import { TEMPLATE_VARIABLES } from '@/lib/types'
import { previewTemplate } from '@/lib/naming'
import { ManualInputs } from '@/lib/types'

interface Props {
  template: string
  onChange: (template: string) => void
  manualInputs: ManualInputs
}

const sourceLabel: Record<string, { label: string; color: string }> = {
  ocr: { label: 'OCR', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  manual: { label: '手動', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  auto: { label: '自動', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
}

export default function NamingRuleBuilder({ template, onChange, manualInputs }: Props) {
  const insertVariable = (variable: string) => {
    onChange(template + variable)
  }

  const preview = previewTemplate(template, manualInputs)

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          命名テンプレート
        </label>
        <input
          type="text"
          value={template}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例: {請求年月}_{取引先名}_{請求月}月請求書"
        />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">変数をクリックしてテンプレートに追加：</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((v) => {
            const style = sourceLabel[v.source]
            return (
              <button
                key={v.key}
                onClick={() => insertVariable(v.key)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${style.color}`}
                title={`${style.label}から取得`}
              >
                {v.key}
                <span className="ml-1 opacity-60 text-xs">[{style.label}]</span>
              </button>
            )
          })}
        </div>
      </div>

      {template && (
        <div className="bg-gray-50 rounded px-3 py-2 text-sm">
          <span className="text-gray-500 text-xs">プレビュー例: </span>
          <span className="font-mono text-gray-800">{preview}.pdf</span>
        </div>
      )}
    </div>
  )
}
