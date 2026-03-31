@AGENTS.md

# invoice-renamer

請求書ファイルのリネーム自動化Webアプリ。

## 概要

- ユーザーがPDF/画像の請求書をアップロード
- Gemini APIでOCRし、取引先名・請求日・支払期日などを抽出
- ユーザー定義の命名テンプレートに従ってファイルをリネーム
- 処理履歴をSupabaseに保存・参照可能

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **認証/DB**: Supabase (メール/PW認証 + PostgreSQL)
- **OCR**: Google Gemini API (ユーザーが自身のAPIキーを設定)
- **ホスティング**: Vercel

## 命名テンプレート変数

| 変数 | 内容 | 取得元 |
|------|------|--------|
| `{取引先名}` | 請求書発行元の会社名 | OCR |
| `{請求日}` | 請求書発行日 | OCR |
| `{支払期日}` | 支払期限 | OCR |
| `{請求月}` | ユーザー手動入力（mm） | 手動 |
| `{請求年月}` | ユーザー手動入力（yymm） | 手動 |
| `{請求金額}` | 請求合計金額 | OCR |
| `{請求書番号}` | インボイス番号 | OCR |
| `{処理日}` | 処理実行日 | 自動 |
| `{連番}` | バッチ内連番 | 自動 |

## 画面構成

1. `/` - ログイン/新規登録
2. `/dashboard` - メイン処理画面（ファイルアップロード → OCR → プレビュー → リネーム）
3. `/settings` - 命名ルール設定・Gemini APIキー設定
4. `/history` - 処理済みファイル履歴一覧

## DB設計（Supabase）

- `profiles` - ユーザープロフィール（APIキー保存含む）
- `naming_rules` - ユーザー別命名テンプレート
- `processing_history` - 処理済みファイル履歴

## 開発コマンド

```bash
npm run dev    # 開発サーバー起動 (localhost:3000)
npm run build  # ビルド
npm run lint   # Lint
```
