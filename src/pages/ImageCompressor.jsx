import { useState, useEffect} from 'react'
import DropZone      from '../components/DropZone'
import FileQueue     from '../components/FileQueue'
import SettingsPanel from '../components/SettingsPanel'
import ResultsBar    from '../components/ResultsBar'
import { useImageCompress } from '../hooks/useImageCompress'
import { selectTotalOriginal, selectTotalCompressed } from '../store/compressionStore'
import { useCompressionStore } from '../store/compressionStore'
import { formatBytes} from '../hooks/formatBytes'


export default function ImageCompressor() {
  const {
    files,
    preset,
    setPreset,
    stageFiles,
    compressAll,
    removeFile,
    clearFiles,
    retryFile,
    downloadOne,
    downloadAll,
    hasIdle,
    hasAnyDone,
    allSettled,
  } = useImageCompress()

  const totalOriginal    = useCompressionStore(selectTotalOriginal)
  const totalCompressed  = useCompressionStore(selectTotalCompressed)
  const hasFiles         = files.length > 0
  const compressing      = files.some(f => f.status === 'compressing')
  const [autoDownload, setAutoDownload] = useState(false)

  const downloadedRef = new Set()

useEffect(() => {
  if (!autoDownload) return

  files.forEach(file => {
    if (
      file.status === 'done' &&
      file.result?.url &&
      !downloadedRef.has(file.id)
    ) {
      const a = document.createElement('a')
      a.href = file.result.url
      a.download = file.result.name
      a.click()

      downloadedRef.add(file.id)
    }
  })
}, [files, autoDownload])

  return (
    <div className="flex flex-col gap-4">

      {/* Drop zone — always visible */}
      <DropZone onFiles={stageFiles} hasFiles={hasFiles} />

      {/* File list */}
      {hasFiles && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
              {files.length} file{files.length !== 1 ? 's' : ''}
              {totalOriginal > 0 && <span className="ml-1 text-zinc-300">· {formatBytes(totalOriginal)}</span>}
            </p>
            <button
              onClick={clearFiles}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Clear all
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

      {/* Preset picker — shown when files are staged and not all done */}
      {hasFiles && !allSettled && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide px-0.5">
            Choose compression level
          </p>
          <SettingsPanel
            preset={preset}
            onSelect={setPreset}
            files={files}
          />
            <div className="flex items-center justify-between px-1">
                <p className="text-xs text-zinc-500">Auto download</p>

                <button
                    onClick={() => setAutoDownload(prev => !prev)}
                    className={[
                    'w-10 h-5 rounded-full transition-colors',
                    autoDownload ? 'bg-blue-500' : 'bg-zinc-300'
                    ].join(' ')}
                >
                    <div
                    className={[
                        'w-4 h-4 bg-white rounded-full transition-transform',
                        autoDownload ? 'translate-x-5' : 'translate-x-0'
                    ].join(' ')}
                    />
                </button>
            </div>
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
        </div>
      )}

      {/* Results bar — shown after compression */}
      {hasAnyDone && (
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
