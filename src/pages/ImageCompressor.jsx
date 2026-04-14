import { useState, useEffect, useRef } from 'react'
import DropZone      from '../components/DropZone'
import FileQueue     from '../components/FileQueue'
import SettingsPanel from '../components/SettingsPanel'
import ResultsBar    from '../components/ResultsBar'
import { useImageCompress } from '../hooks/useImageCompress'
import { useCompressionStore, selectTotalOriginal, selectTotalCompressed } from '../store/compressionStore'
import { formatBytes } from '../hooks/formatBytes'

export default function ImageCompressor() {
  const {
    files, preset, previews, useAdvanced, advancedSettings,
    setPreset, setAdvancedSettings, resetAdvanced,
    stageFiles, replaceWithFiles,
    compressAll, recompressAll,
    removeFile, clearFiles, retryFile,
    downloadOne, downloadAll, downloadZip,
    copyToClipboard, setFileOutputName, setFilePresetOverride,
    hasIdle, hasAnyDone, allSettled, compressing,
  } = useImageCompress()

  const totalOriginal   = useCompressionStore(selectTotalOriginal)
  const totalCompressed = useCompressionStore(selectTotalCompressed)
  const previewGen      = useCompressionStore(s => s.previewGeneration)

  const hasFiles  = files.length > 0
  const multiFile = files.length > 1

  const [autoDownload, setAutoDownload] = useState(false)
  const downloadedRef = useRef(new Set())
  const lastGenRef    = useRef(previewGen)

  useEffect(() => {
    if (previewGen !== lastGenRef.current) { downloadedRef.current.clear(); lastGenRef.current = previewGen }
  }, [previewGen])

  useEffect(() => {
    if (files.some(f => f.status === 'idle')) downloadedRef.current.clear()
  }, [files])

  useEffect(() => {
    if (!autoDownload) return
    files.forEach(file => {
      if (file.status === 'done' && file.result?.url && !downloadedRef.current.has(file.id)) {
        triggerAutoDownload(file.result.url, file.result.name)
        downloadedRef.current.add(file.id)
      }
    })
  }, [files, autoDownload])

  const handleDrop = (rawFiles) => {
    if (!hasFiles) replaceWithFiles(rawFiles)
    else stageFiles(rawFiles)
  }

  return (
    <div className="flex flex-col gap-5">

      <DropZone onFiles={handleDrop} hasFiles={hasFiles} compressing={compressing} />

      {!hasFiles && (
        <p className="text-center text-xs -mt-3" style={{ color: '#D9D9D9' }}>
          Drop anywhere · Paste Ctrl+V · Space to compress
        </p>
      )}

      {hasFiles && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#6B4F3A' }}>
              {files.length} file{files.length !== 1 ? 's' : ''}
              {totalOriginal > 0 && <span className="ml-1.5 font-normal" style={{ color: '#D9D9D9' }}>· {formatBytes(totalOriginal)}</span>}
            </p>
            <button onClick={clearFiles} className="text-[11px] transition-colors" style={{ color: '#D9D9D9' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6B4F3A'}
              onMouseLeave={e => e.currentTarget.style.color = '#D9D9D9'}>
              Clear all
            </button>
          </div>

          <FileQueue files={files} onRemove={removeFile} onRetry={retryFile}
            onDownload={downloadOne} onCopy={copyToClipboard}
            onRename={setFileOutputName} onPresetOverride={setFilePresetOverride} />
        </div>
      )}

      {hasFiles && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest px-0.5" style={{ color: '#6B4F3A' }}>
            Compression level
          </p>

          <SettingsPanel
            preset={preset} onSelect={setPreset} previews={previews}
            useAdvanced={useAdvanced} advancedSettings={advancedSettings}
            onAdvancedChange={setAdvancedSettings} onResetAdvanced={resetAdvanced}
          />

          {/* Auto download */}
          <div className="flex items-center justify-between px-0.5">
            <p className="text-xs" style={{ color: '#6B4F3A' }}>Auto download when done</p>
            <button type="button" role="switch" aria-checked={autoDownload}
              onClick={() => setAutoDownload(p => !p)}
              className="relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
              style={{ width: 40, height: 24, background: autoDownload ? '#1F3D2B' : '#D9D9D9' }}>
              <span aria-hidden="true" className="absolute top-[3px] rounded-full transition-all duration-200"
                style={{ width: 18, height: 18, background: '#F5F1E8', left: autoDownload ? 19 : 3 }} />
            </button>
          </div>

          {/* Main CTA */}
          {!allSettled ? (
            <button onClick={compressAll} disabled={compressing || !hasIdle}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-150 active:scale-[0.99]"
              style={{
                background: compressing || !hasIdle
                  ? '#E8E4DC'
                  : 'linear-gradient(135deg, #1F3D2B 0%, #2d5a3d 100%)',
                color: compressing || !hasIdle ? '#D9D9D9' : '#F5F1E8',
                cursor: compressing || !hasIdle ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
              }}>
              {compressing
                ? '🌿 Compressing…'
                : `Compress${files.length > 1 ? ` ${files.length} images` : ''}`}
            </button>
          ) : (
            <button onClick={recompressAll}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-150 active:scale-[0.99]"
              style={{ background: 'transparent', color: '#1F3D2B', border: '1.5px solid #4CAF50' }}>
              Re-compress with new settings
            </button>
          )}
        </div>
      )}

      {hasAnyDone && allSettled && (
        <ResultsBar
          totalOriginal={totalOriginal} totalCompressed={totalCompressed}
          allSettled={allSettled} multiFile={multiFile}
          onDownloadAll={downloadAll} onDownloadZip={downloadZip} onClearAll={clearFiles}
        />
      )}

    </div>
  )
}

function triggerAutoDownload(url, name) {
  fetch(url).then(r => r.blob()).then(blob => {
    const reader = new FileReader()
    reader.onload = () => {
      const a = document.createElement('a')
      a.href = reader.result; a.download = name
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }
    reader.readAsDataURL(blob)
  })
}
