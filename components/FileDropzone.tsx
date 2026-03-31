'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface Props {
  onFilesAdded: (files: File[]) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
}

export default function FileDropzone({ onFilesAdded, disabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFilesAdded(accepted)
    },
    [onFilesAdded]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    disabled,
    multiple: true,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="text-gray-400 text-3xl mb-2">📂</div>
      {isDragActive ? (
        <p className="text-blue-600 font-medium">ここにドロップ</p>
      ) : (
        <>
          <p className="text-gray-600 font-medium">ファイルをドラッグ＆ドロップ</p>
          <p className="text-gray-400 text-sm mt-1">または クリックして選択</p>
          <p className="text-gray-300 text-xs mt-2">PDF・JPG・PNG・WEBP・HEIC 対応</p>
        </>
      )}
    </div>
  )
}
