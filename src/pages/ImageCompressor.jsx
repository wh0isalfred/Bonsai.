import { useState, useEffect, useRef } from 'react'
import DropZone      from '../components/DropZone'
import FileQueue     from '../components/FileQueue'
import SettingsPanel from '../components/SettingsPanel'
import ResultsBar    from '../components/ResultsBar'
import ImageCompare  from '../components/ImageCompare'
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
    copyToClipboard, setFileOutputName,
    hasIdle, hasAnyDone, allSettled, compressing,
  } = useImageCompress()

  const totalOriginal   = useCompressionStore(selectTotalOriginal)
  const totalCompressed = useCompressionStore(selectTotalCompressed)
  const previewGen      = useCompressionStore(s => s.previewGeneration)

  const hasFiles  = files.length > 0
  const multiFile = files.length > 1

  // Track before-image URLs per file — created once, revoked on file removal
  const [beforeUrls, setBeforeUrls] = useState({})
  useEffect(() => {
    const next = {}
    files.forEach(f => {
      if (!f.file) return
      // Reuse existing URL if we already have one for this file object
      next[f.id] = beforeUrls[f.id] ?? URL.createObjectURL(f.file)
    })
    // Revoke URLs for files that are no longer in the list
    Object.entries(beforeUrls).forEach(([id, url]) => {
      if (!next[id]) URL.revokeObjectURL(url)
    })
    setBeforeUrls(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map(f => f.id).join(',')])

  // Cleanup all URLs on unmount
  useEffect(() => () => {
    Object.values(beforeUrls).forEach(url => URL.revokeObjectURL(url))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-download logic
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

  // First file — used for estimated size in SettingsPanel
  const firstFile = files[0] ?? null

  // Files that have been compressed and have a before URL available
  const doneFiles = files.filter(f => f.status === 'done' && f.result?.url && beforeUrls[f.id])

  return (
    <div className="flex flex-col gap-5">

      {/* 1 — Drop zone */}
      <DropZone onFiles={handleDrop} hasFiles={hasFiles} compressing={compressing} />

      {!hasFiles && (
        <p className="text-center text-xs -mt-3" style={{ color: '#acacac' }}>
          Drop anywhere · Paste Ctrl+V · Space to compress · Click filename to rename
        </p>
      )}

      {/* 2 — File cards */}
      {hasFiles && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6B4F3A' }}>
              {files.length} file{files.length !== 1 ? 's' : ''}
              {totalOriginal > 0 && (
                <span className="ml-1.5 font-normal" style={{ color: '#D9D9D9' }}>
                  · {formatBytes(totalOriginal)}
                </span>
              )}
            </p>
            <button onClick={clearFiles}
              className="text-[11px] transition-colors" style={{ color: '#D9D9D9' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6B4F3A'}
              onMouseLeave={e => e.currentTarget.style.color = '#D9D9D9'}>
              Clear all
            </button>
          </div>

          <FileQueue
            files={files}
            onRemove={removeFile}
            onRetry={retryFile}
            onDownload={downloadOne}
            onCopy={copyToClipboard}
            onRename={setFileOutputName}
          />
        </div>
      )}

      {/* 3 — Before/After compare sliders (shown after compression, above settings) */}
      {doneFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: '#6B4F3A' }}>
            Before / After
          </p>
          {doneFiles.map(f => (
            <ImageCompare
              key={f.id}
              before={beforeUrls[f.id]}
              after={f.result.url}
            />
          ))}
        </div>
      )}

      {/* 4 — Settings (visible from the start once files are queued) */}
      {hasFiles && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: '#6B4F3A' }}>
            Compression level
          </p>

          <SettingsPanel
            preset={preset}
            onSelect={setPreset}
            previews={previews}
            useAdvanced={useAdvanced}
            advancedSettings={advancedSettings}
            onAdvancedChange={setAdvancedSettings}
            onResetAdvanced={resetAdvanced}
            firstFile={firstFile}
          />

          {/* Auto download toggle */}
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
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all duration-150 active:scale-[0.99]"
              style={{
                background: compressing || !hasIdle
                  ? '#E8E4DC'
                  : 'linear-gradient(135deg, #1F3D2B 0%, #2d5c3e 100%)',
                color:  compressing || !hasIdle ? '#D9D9D9' : '#F5F1E8',
                cursor: compressing || !hasIdle ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
              }}>
              {compressing ? (
                <span className="flex items-center justify-center gap-3">
                  <BouncingBars />
                  <span>Compressing…</span>
                </span>
              ) : (
                `Compress${files.length > 1 ? ` ${files.length} images` : ''}`
              )}
            </button>
          ) : (
            <button onClick={recompressAll}
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all duration-150 active:scale-[0.99]"
              style={{ background: 'transparent', color: '#1F3D2B', border: '1.5px solid #4CAF50' }}>
              ↺ Re-compress with new settings
            </button>
          )}
        </div>
      )}

      {/* 5 — Results bar */}
      {hasAnyDone && allSettled && (
        <ResultsBar
          totalOriginal={totalOriginal}
          totalCompressed={totalCompressed}
          allSettled={allSettled}
          multiFile={multiFile}
          onDownloadAll={downloadAll}
          onDownloadZip={downloadZip}
          onClearAll={clearFiles}
        />
      )}
    </div>
  )
}

// ── Compressing animation ─────────────────────────────────────────────────────
function BouncingBars() {
  return (
    <span className="flex gap-0.5 items-end h-4" aria-hidden="true">
      <style>{`
        @keyframes bb {
          0%,80%,100% { transform: scaleY(0.4); opacity: 0.4; }
          40%          { transform: scaleY(1.1); opacity: 1;   }
        }
      `}</style>
      {[0, 0.12, 0.24].map((d, i) => (
        <span key={i} className="inline-block w-1 rounded-full"
          style={{ height: 14, background: '#F5F1E8', animation: `bb 1s ${d}s ease-in-out infinite` }} />
      ))}
    </span>
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
