import { useState, useEffect, useRef, useCallback } from 'react'
import DropZone      from './DropZone'
import ResultsBar    from '../ResultsBar'
import ImageCompare  from './ImageCompare'
import UpgradeModal  from '../UpgradeModal'
import { useImageCompress } from '../hooks/useImageCompress'
import { useCompressionStore, selectTotalOriginal, selectTotalCompressed } from '../../store/compressionStore'
import { useModeStore } from '../../store/useModeStore'
import { formatBytes } from '../hooks/formatBytes'

export default function ImageCompressor({ onAddBatch }) {
  const mode    = useModeStore(s => s.mode)
  const isPro   = useModeStore(s => s.isPro)
  const canExport    = useModeStore(s => s.canExport)
  const hasTrialExport = useModeStore(s => s.hasTrialExport)
  const useTrial     = useModeStore(s => s.useTrial)

  const isSmart = mode === 'smart'
  const isProMode = mode === 'pro'

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

  // Before-image URLs: created once per file, revoked on removal
  const [beforeUrls, setBeforeUrls] = useState({})
  const fileIdString = files.map(f => f.id).join(',')
  useEffect(() => {
    const next = {}
    files.forEach(f => {
      if (!f.file) return
      next[f.id] = beforeUrls[f.id] ?? URL.createObjectURL(f.file)
    })
    Object.entries(beforeUrls).forEach(([id, url]) => {
      if (!next[id]) URL.revokeObjectURL(url)
    })
    setBeforeUrls(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileIdString])

  useEffect(() => () => {
    Object.values(beforeUrls).forEach(url => URL.revokeObjectURL(url))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-download
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
        // In Smart Mode always auto-download; in Pro Mode only if user can export
        if (isSmart || isPro) {
          triggerAutoDownload(file.result.url, file.result.name)
          downloadedRef.current.add(file.id)
        }
      }
    })
  }, [files, autoDownload, isSmart, isPro])

  // Upgrade modal state
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // 'download' | 'zip'

  // When batch completes, record to history
  useEffect(() => {
    if (allSettled && hasAnyDone && onAddBatch) {
      const doneFils = files.filter(f => f.status === 'done')
      if (doneFils.length > 0) onAddBatch(doneFils, isPro)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSettled])

  // Gated export handlers
  const handleDownloadAll = useCallback(() => {
    if (canExport()) { downloadAll(); return }
    setPendingAction('download'); setShowUpgrade(true)
  }, [canExport, downloadAll])

  const handleDownloadZip = useCallback(() => {
    if (canExport()) { downloadZip(); return }
    setPendingAction('zip'); setShowUpgrade(true)
  }, [canExport, downloadZip])

  const handleDownloadOne = useCallback((id) => {
    if (isSmart || canExport()) { downloadOne(id); return }
    setPendingAction('download'); setShowUpgrade(true)
  }, [isSmart, canExport, downloadOne])

  const handleTrialExport = useCallback(() => {
    useTrial()
    setShowUpgrade(false)
    if (pendingAction === 'zip') downloadZip()
    else downloadAll()
  }, [useTrial, pendingAction, downloadZip, downloadAll])

  const handleDrop = (rawFiles) => {
    // Smart Mode: single file only (one at a time UX)
    // Pro Mode: unlimited batch
    const toAdd = isSmart ? [rawFiles[0]].filter(Boolean) : rawFiles
    if (!hasFiles) replaceWithFiles(toAdd)
    else stageFiles(toAdd)
  }

  const firstFile = files[0] ?? null
  const doneFiles = files.filter(f => f.status === 'done' && f.result?.url && beforeUrls[f.id])

  return (
    <div className="flex flex-col gap-5">

      {/* ── Drop zone ── */}
      <DropZone onFiles={handleDrop} hasFiles={hasFiles} compressing={compressing} />

      {!hasFiles && (
        <p className="text-center text-xs -mt-3" style={{ color: '#acacac' }}>
          {isSmart
            ? 'Drop an image · Paste Ctrl+V · One click to compress'
            : 'Drop anywhere · Paste Ctrl+V · Space to compress · Click filename to rename'
          }
        </p>
      )}

      {/* ── File list ── */}
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
            onDownload={handleDownloadOne}
            onCopy={copyToClipboard}
            onRename={setFileOutputName}
          />
        </div>
      )}

      {/* ── Before/After compare (above settings, below files) ── */}
      {doneFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: '#6B4F3A' }}>
            Before / After
          </p>
          {doneFiles.map(f => (
            <ImageCompare key={f.id} before={beforeUrls[f.id]} after={f.result.url} />
          ))}
        </div>
      )}

      {/* ── Settings ── */}
      {hasFiles && (
        <div className="flex flex-col gap-3">

          {/* Smart Mode: just preset cards, no advanced */}
          {isSmart && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: '#6B4F3A' }}>
                Compression level
              </p>
              {/* Smart Mode preset selector — simplified, no advanced options button */}
              <SmartPresetSelector preset={preset} onSelect={setPreset} previews={previews} />
            </>
          )}

          {/* Pro Mode: full settings panel */}
          {isProMode && (
            <>
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
            </>
          )}

          {/* Auto download — always available */}
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
                background: compressing || !hasIdle ? '#E8E4DC'
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
              ) : isSmart ? (
                'Compress'
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

          {/* Pro Mode export gate hint */}
          {isProMode && !isPro && allSettled && hasAnyDone && (
            <div className="flex items-center gap-2 px-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#6B4F3A" strokeWidth="1.2" />
                <path d="M6 5.5v3M6 4h.01" stroke="#6B4F3A" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              <p className="text-[11px]" style={{ color: '#6B4F3A' }}>
                Upgrade to Pro to download your optimised images.
                <button onClick={() => setShowUpgrade(true)}
                  className="ml-1 underline font-semibold" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1F3D2B', fontSize: 'inherit' }}>
                  Upgrade →
                </button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Results bar ── */}
      {hasAnyDone && allSettled && (
        <ResultsBar
          totalOriginal={totalOriginal}
          totalCompressed={totalCompressed}
          allSettled={allSettled}
          multiFile={multiFile && !isSmart}
          onDownloadAll={handleDownloadAll}
          onDownloadZip={handleDownloadZip}
          onClearAll={clearFiles}
          locked={isProMode && !isPro}
          onUnlock={() => setShowUpgrade(true)}
        />
      )}

      {/* ── Upgrade modal ── */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onTrial={handleTrialExport}
          onUpgrade={() => {
            setShowUpgrade(false)
            // TODO: route to payment flow
            window.location.href = '/pricing'
          }}
        />
      )}
    </div>
  )
}

// ── Smart Mode preset selector ────────────────────────────────────────────────
// Simplified — no advanced button, no estimated sizes per file
import { PRESETS } from '../../config/presets'


function SmartPresetSelector({ preset, onSelect, previews }) {
  return (
    <div className="flex flex-col gap-2">
      {PRESETS.map(p => {
        const active   = preset === p.id
        const preview  = previews[p.id]
        const loading  = preview?.loading ?? false
        const size     = preview?.size    ?? null

        return (
          <button key={p.id} onClick={() => onSelect(p.id)}
            className="w-full text-left px-4 py-3.5 rounded-2xl focus:outline-none transition-all duration-150"
            style={{
              border: `1.5px solid ${active ? '#4CAF50' : '#E8E4DC'}`,
              background: active
                ? 'linear-gradient(135deg, rgba(31,61,43,0.05) 0%, rgba(76,175,80,0.06) 100%)'
                : '#fff',
            }}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold"
                    style={{ color: active ? '#1F3D2B' : '#2A2A2A' }}>
                    {p.label}
                  </span>
                  {loading ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium"
                      style={{ background: '#F5F1E8', color: '#6B4F3A' }}>
                      <SmallSpinner /> Calculating…
                    </span>
                  ) : size !== null ? (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                      style={{
                        background: active ? '#1F3D2B' : '#F5F1E8',
                        color: active ? '#F5F1E8' : '#6B4F3A',
                      }}>
                      → {formatBytes(size)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs mt-0.5" style={{ color: active ? '#4CAF50' : '#6B4F3A' }}>
                  {p.description}
                </p>
              </div>
              <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  border: `2px solid ${active ? '#4CAF50' : '#D9D9D9'}`,
                  background: active ? '#4CAF50' : '#fff',
                }}>
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SmallSpinner() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
      style={{ animation: 'sp 0.75s linear infinite', display: 'inline-block' }}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
      <path d="M5 1 A4 4 0 0 1 9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Compressing animation ─────────────────────────────────────────────────────
function BouncingBars() {
  return (
    <span className="flex gap-0.5 items-end h-4" aria-hidden="true">
      <style>{`@keyframes bb{0%,80%,100%{transform:scaleY(0.4);opacity:0.4}40%{transform:scaleY(1.1);opacity:1}}`}</style>
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
