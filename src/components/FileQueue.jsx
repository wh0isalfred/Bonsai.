import { useState, useEffect } from 'react'
import FileCard     from './Filecard'
import ImageCompare from './ImageCompare'

export default function FileQueue(props) {
  const {
    files = [],
    onRemove,
    onRetry,
    onDownload,
    onCopy,
    onRename,
    onPresetOverride
  } = props || {}

  if (!Array.isArray(files) || files.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {files.map((file, index) => {
        const key = file?.id ?? index
        return (
          <FileItem
            key={key}
            file={file}
            onRemove={onRemove}
            onRetry={onRetry}
            onDownload={onDownload}
            onCopy={onCopy}
            onRename={onRename}
            onPresetOverride={onPresetOverride}
          />
        )
      })}
    </div>
  )
}

function FileItem(props) {
  const {
    file,
    onRemove,
    onRetry,
    onDownload,
    onCopy,
    onRename,
    onPresetOverride
  } = props || {}

  const [beforeUrl, setBeforeUrl] = useState(null)

  const rawFile = file?.file

  useEffect(() => {
  if (!rawFile || !(rawFile instanceof Blob)) return

  let url

  try {
    url = URL.createObjectURL(rawFile)
    setBeforeUrl(url)
  } catch {
    return
  }

  return () => {
    if (url) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore revoke errors
      }
    }
  }
}, [rawFile])

  const status = file?.status
  const resultUrl = file?.result?.url

  return (
    <div className="flex flex-col gap-2">
      <FileCard
        file={file}
        onRemove={onRemove}
        onRetry={onRetry}
        onDownload={onDownload}
        onCopy={onCopy}
        onRename={onRename}
        onPresetOverride={onPresetOverride}
      />

      {status === 'done' && resultUrl && beforeUrl && (
        <ImageCompare
          before={beforeUrl}
          after={resultUrl}
        />
      )}
    </div>
  )
}