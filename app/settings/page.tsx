'use client'

import { useState, useEffect } from 'react'
import NamingRuleBuilder from '@/components/NamingRuleBuilder'
import { getSettings, saveSettings } from '@/lib/storage'
import {
  DEFAULT_TEMPLATE, DEFAULT_GEMINI_MODEL, DEFAULT_GROK_MODEL,
  GEMINI_MODELS, GROK_MODELS,
  GeminiModelId, GrokModelId, OcrProvider, ManualInputs,
} from '@/lib/types'

export default function SettingsPage() {
  const [provider, setProvider] = useState<OcrProvider>('gemini')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState<GeminiModelId>(DEFAULT_GEMINI_MODEL)
  const [grokApiKey, setGrokApiKey] = useState('')
  const [grokModel, setGrokModel] = useState<GrokModelId>(DEFAULT_GROK_MODEL)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [saved, setSaved] = useState(false)

  const previewInputs: ManualInputs = { 請求月: '02', 請求年月: '2602' }

  useEffect(() => {
    const s = getSettings()
    setProvider(s.provider)
    setGeminiApiKey(s.geminiApiKey)
    setGeminiModel(s.geminiModel)
    setGrokApiKey(s.grokApiKey)
    setGrokModel(s.grokModel)
    setTemplate(s.namingTemplate)
  }, [])

  const handleSave = () => {
    saveSettings({
      provider,
      geminiApiKey,
      geminiModel,
      grokApiKey,
      grokModel,
      namingTemplate: template,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">設定</h1>
        <p className="text-sm text-gray-500 mt-1">APIキーと命名ルールを設定します（ブラウザに保存）</p>
      </div>

      {/* Provider 選択 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">OCRプロバイダー</h2>
        <div className="flex gap-3">
          {(['gemini', 'grok'] as OcrProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                provider === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {p === 'gemini' ? 'Google Gemini' : 'xAI Grok'}
            </button>
          ))}
        </div>
      </div>

      {/* Gemini */}
      {provider === 'gemini' && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Gemini API キー</h2>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400">
            Google AI Studio（aistudio.google.com）→「Create API key in new project」で取得
          </p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">モデル</label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value as GeminiModelId)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Grok */}
      {provider === 'grok' && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Grok API キー</h2>
          <input
            type="password"
            value={grokApiKey}
            onChange={(e) => setGrokApiKey(e.target.value)}
            placeholder="xai-..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400">
            console.x.ai でAPIキーを取得してください。PDFは自動的に画像変換して処理します。
          </p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">モデル</label>
            <select
              value={grokModel}
              onChange={(e) => setGrokModel(e.target.value as GrokModelId)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GROK_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 命名ルール */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">命名ルール</h2>
          <button
            onClick={() => setTemplate(DEFAULT_TEMPLATE)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            デフォルトに戻す
          </button>
        </div>
        <NamingRuleBuilder template={template} onChange={setTemplate} manualInputs={previewInputs} />
        <div className="text-xs text-gray-400 space-y-1 pt-1">
          <p><span className="bg-blue-100 text-blue-700 px-1 rounded">[OCR]</span> AIが請求書から自動抽出</p>
          <p><span className="bg-orange-100 text-orange-700 px-1 rounded">[手動]</span> 処理画面で毎回入力</p>
          <p><span className="bg-green-100 text-green-700 px-1 rounded">[自動]</span> システムが自動生成</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          保存
        </button>
        {saved && <span className="text-green-600 text-sm">✅ 保存しました</span>}
      </div>
    </div>
  )
}
