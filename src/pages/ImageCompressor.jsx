import { useState, useEffect, useRef } from 'react'
import DropZone      from '../components/DropZone'
import FileQueue     from '../components/FileQueue'
import SettingsPanel from '../components/SettingsPanel'
import ResultsBar    from '../components/ResultsBar'
import { useImageCompress }  from '../hooks/useImageCompress'
import { useCompressionStore, selectTotalOriginal, selectTotalCompressed } from '../store/compressionStore'
import { formatBytes } from '../hooks/formatBytes'

export default function ImageCompressor() {
  const {
    files,
    preset,
    previews,
    setPreset,
    stageFiles,
    compressAll,
    recompressAll,
    removeFile,
    clearFiles,
    retryFile,
    downloadOne,
    downloadAll,
    hasIdle,
    hasAnyDone,
    allSettled,
  } = useImageCompress()

  const totalOriginal   = useCompressionStore(selectTotalOriginal)
  const totalCompressed = useCompressionStore(selectTotalCompressed)
  const previewGen      = useCompressionStore(s => s.previewGeneration)

  const hasFiles    = files.length > 0
  const compressing = files.some(f => f.status === 'compressing')

  const [autoDownload, setAutoDownload] = useState(false)
  const downloadedRef  = useRef(new Set())
  const lastGenRef     = useRef(previewGen)

  // Clear the downloaded Set when a genuinely new file is staged —
  // tracked via previewGeneration from the store, which increments on addFiles/clearFiles.
  // More robust than comparing joined ID strings.
  useEffect(() => {
    if (previewGen !== lastGenRef.current) {
      downloadedRef.current.clear()
      lastGenRef.current = previewGen
    }
  }, [previewGen])

  // Also clear when re-compress resets files back to idle
  // (IDs stay the same but results are wiped — we want auto-download to fire again)
  useEffect(() => {
    const anyIdle = files.some(f => f.status === 'idle')
    if (anyIdle) downloadedRef.current.clear()
  }, [files])

  useEffect(() => {
    if (!autoDownload) return
    files.forEach(file => {
      if (
        file.status === 'done' &&
        file.result?.url &&
        !downloadedRef.current.has(file.id)
      ) {
        triggerAutoDownload(file.result.url, file.result.name)
        downloadedRef.current.add(file.id)
      }
    })
  }, [files, autoDownload])

  return (
    <div className="flex flex-col gap-4">

      <DropZone onFiles={stageFiles} hasFiles={hasFiles} />

      {hasFiles && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
              {files.length} file{files.length !== 1 ? 's' : ''}
              {totalOriginal > 0 && (
                <span className="ml-1 text-zinc-300">· {formatBytes(totalOriginal)}</span>
              )}
            </p>
            <button
              onClick={clearFiles}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Clear
            </button>
          </div>

          <FileQueue
            files={files}
            onRemove={removeFile}
            onRetry={retryFile}
            onDownload={downloadOne}
          />
        </div>
      )}

      {hasFiles && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-0.5">
            Compression level
          </p>

          <SettingsPanel
            preset={preset}
            onSelect={setPreset}
            previews={previews}
          />

          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-zinc-500">Auto download</p>
            <button
              type="button"
              role="switch"
              aria-checked={autoDownload}
              onClick={() => setAutoDownload(prev => !prev)}
              className={[
                'relative flex-shrink-0 rounded-full transition-colors duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                autoDownload ? 'bg-blue-500' : 'bg-zinc-200',
              ].join(' ')}
              style={{ width: 40, height: 24 }}
            >
              <span
                aria-hidden="true"
                className="absolute top-[3px] rounded-full bg-white shadow-sm transition-all duration-200"
                style={{ width: 18, height: 18, left: autoDownload ? 19 : 3 }}
              />
            </button>
          </div>

          {!allSettled ? (
            <button
              onClick={compressAll}
              disabled={compressing || !hasIdle}
              className={[
                'w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150',
                compressing || !hasIdle
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.99]',
              ].join(' ')}
            >
              {compressing ? 'Compressing…' : 'Compress'}
            </button>
          ) : (
            <button
              onClick={recompressAll}
              className="w-full py-3 rounded-xl text-sm font-semibold border border-blue-200 text-blue-500 bg-white hover:bg-blue-50 transition-all duration-150 active:scale-[0.99]"
            >
              Re-compress with new settings
            </button>
          )}
        </div>
      )}

      {hasAnyDone && allSettled && (
        <ResultsBar
          totalOriginal={totalOriginal}
          totalCompressed={totalCompressed}
          allSettled={allSettled}
          onDownloadAll={downloadAll}
          onClearAll={clearFiles}
        />
      )}

    </div>
  )
}

function triggerAutoDownload(url, name) {
  fetch(url)
    .then(r => r.blob())
    .then(blob => {
      const reader = new FileReader()
      reader.onload = () => {
        const a = document.createElement('a')
        a.href     = reader.result
        a.download = name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      reader.readAsDataURL(blob)
    })
}
