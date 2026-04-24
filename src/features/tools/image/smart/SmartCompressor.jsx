/**
 * src/features/tools/image/smart/SmartCompressor.jsx
 *
 * Smart mode orchestrator. Self-contained local state — no Zustand needed.
 *
 * File state machine:
 *   idle → compressing → done
 *                     ↘ error
 *
 * UX flow:
 *   1. Drop images (DropZone or compact strip once files staged)
 *   2. Pick preset (PresetPicker)
 *   3. Click "Compress" — workers fire in parallel
 *   4. ResultsGrid shows compressing cards (leaf animation) → done cards (flip/compare)
 *   5. Download individually or ZIP all
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import DropZone     from '../../../../components/ui/DropZone'
import PresetPicker from './PresetPicker'
import ResultsGrid  from './ResultsGrid'
import { useHistoryStore } from '../../../../store/userHistoryStore'
import { useAuthStore }    from '../../../../store/useAuthStore'
import { useDownloads }    from '../../../../hooks/useDownloads'
import { useAutoDownload } from '../../../../hooks/useAutoDownload'
import { getPresetById }   from '../../../../config/presets'
import { formatBytes }     from '../../../../utils/formatBytes'

const FREE_LIMIT = 15   // free users
const PRO_LIMIT  = null // null = unlimited

let _seq = 0
const nextId = () => `sc_${Date.now()}_${++_seq}`

/* ══════════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export default function SmartCompressor() {
  const [files,        setFiles]        = useState([])
  const [preset,       setPreset]       = useState('high')
  const [autoDownload, setAutoDownload] = useState(false)
  const [limitWarn,    setLimitWarn]    = useState(false)
  const [presetSizes,  setPresetSizes]  = useState({})
  const [estimating,   setEstimating]   = useState(false)

  const workers    = useRef(new Map())
  const savedRef   = useRef(false)
  const estWorkers = useRef(new Map())

  const plan = useAuthStore(s => s.plan)
  const isPaid = plan === 'pro' || plan === 'supporter'
  /* null = no limit (paid), number = cap (free) */
  const SMART_LIMIT = isPaid ? PRO_LIMIT : FREE_LIMIT

  const { addBatch }    = useHistoryStore()
  const { downloadZip } = useDownloads()

  /* ── Estimate compressed sizes for all presets ────────────────────
     Runs on ALL idle files in parallel, sums results per preset.
     Uses a small 320px thumbnail encode to stay fast.
     Result: total estimated output bytes across all staged files. */
  const estimatePresetSizes = useCallback(async (idleFileList) => {
    if (!idleFileList.length) { setPresetSizes({}); return }

    setEstimating(true)
    const MAX = 320

    /* For each file, encode at each preset quality and collect bytes */
    const perFile = await Promise.all(
      idleFileList.map(({ file, size: originalSize }) =>
        new Promise(resolveFile => {
          const url = URL.createObjectURL(file)
          const img = new Image()

          img.onload = async () => {
            URL.revokeObjectURL(url)

            const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
            const w = Math.max(1, Math.round(img.naturalWidth  * scale))
            const h = Math.max(1, Math.round(img.naturalHeight * scale))

            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, w, h)

            const fileResults = {}

            await Promise.all(PRESETS.map(p =>
              new Promise(res => {
                const q = Math.max(0.01, Math.min(0.99, p.settings.quality))
                canvas.toBlob(blob => {
                  if (!blob) { res(); return }

                  /* Extrapolate to full resolution, cap upward only */
                  const rawEst = scale < 1
                    ? Math.round(blob.size / (scale * scale))
                    : blob.size
                  fileResults[p.id] = Math.min(rawEst, originalSize)
                  res()
                }, 'image/webp', q)
              })
            ))

            resolveFile(fileResults)
          }

          img.onerror = () => resolveFile({})
          img.src = url
        })
      )
    )

    /* Sum per-preset estimates across all files */
    const totals = {}
    PRESETS.forEach(p => {
      totals[p.id] = perFile.reduce((sum, f) => sum + (f[p.id] ?? 0), 0)
    })

    setPresetSizes(totals)
    setEstimating(false)
  }, [])

  /* Re-run when the set of idle files changes */
  useEffect(() => {
    const idle = files.filter(f => f.status === 'idle')
    if (idle.length) {
      estimatePresetSizes(idle)
    } else {
      setPresetSizes({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length])

  /* ── Derived ──────────────────────────────────────────────────────── */
  const hasFiles       = files.length > 0
  const idleFiles      = files.filter(f => f.status === 'idle')
  const doneFiles      = files.filter(f => f.status === 'done')
  const anyCompressing = files.some(f => f.status === 'compressing')
  const allSettled     = hasFiles && !files.some(f =>
    f.status === 'idle' || f.status === 'compressing'
  )

  const totalOrigBytes = files.reduce((s, f) => s + f.size, 0)
  const totalCompBytes = doneFiles.reduce((s, f) => s + (f.result?.compressedSize ?? 0), 0)
  const totalSavingsPct = totalOrigBytes > 0 && totalCompBytes > 0
    ? Math.round((1 - totalCompBytes / totalOrigBytes) * 100)
    : 0

  /* ── Auto-download (fires when each file reaches 'done') ──────────── */
  const autoFiles = files.map(f => ({
    id: f.id, status: f.status, name: f.name,
    outputName: null, size: f.size, result: f.result,
  }))
  useAutoDownload(autoFiles, autoDownload)

  /* ── History save (once, when all settled) ────────────────────────── */
  useEffect(() => {
    if (allSettled && doneFiles.length && !savedRef.current) {
      savedRef.current = true
      addBatch(files, false /* isPro */)
    }
  }, [allSettled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasFiles) savedRef.current = false
  }, [hasFiles])

  /* ── Cleanup on unmount ───────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      workers.current.forEach(w => w.terminate())
      /* Note: we intentionally don't revoke URLs here because unmount
         can happen during route transitions while the user is still on
         the page. URLs are revoked on handleStartOver or explicit remove. */
    }
  }, [])

  /* ── Patch single file ────────────────────────────────────────────── */
  const patch = useCallback((id, update) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...update } : f))
  }, [])

  /* ── Handle dropped files ─────────────────────────────────────────── */
  const handleDrop = useCallback((incoming) => {
    setLimitWarn(false)
    setFiles(prev => {
      /* null limit = unlimited (paid users) */
      const remaining = SMART_LIMIT === null
        ? incoming.length
        : SMART_LIMIT - prev.length

      if (remaining <= 0) { setLimitWarn(true); return prev }

      const existingKeys = new Set(prev.map(f => `${f.name}:${f.size}`))

      const toAdd = incoming
        .slice(0, remaining)
        .filter(f => !existingKeys.has(`${f.name}:${f.size}`))
        .map(f => ({
          id:        nextId(),
          file:      f,
          name:      f.name,
          size:      f.size,
          type:      f.type,
          beforeUrl: URL.createObjectURL(f),
          status:    'idle',
          progress:  0,
          result:    null,
          error:     null,
        }))

      if (SMART_LIMIT !== null && incoming.length > remaining) setLimitWarn(true)
      return [...prev, ...toAdd]
    })
  }, [SMART_LIMIT])

  /* ── Remove one file ──────────────────────────────────────────────── */
  const handleRemove = useCallback((id) => {
    workers.current.get(id)?.terminate()
    workers.current.delete(id)
    setFiles(prev => {
      const f = prev.find(x => x.id === id)
      if (f?.beforeUrl)    URL.revokeObjectURL(f.beforeUrl)
      if (f?.result?.url)  URL.revokeObjectURL(f.result.url)
      return prev.filter(x => x.id !== id)
    })
  }, [])

  /* ── Fire compression workers ─────────────────────────────────────── */
  const handleCompress = useCallback(() => {
    const chosen = getPresetById(preset)

    /* Snapshot of idle files before state mutation */
    const toCompress = files.filter(f => f.status === 'idle')
    if (!toCompress.length) return

    /* Mark all as compressing */
    setFiles(prev => prev.map(f =>
      f.status === 'idle' ? { ...f, status: 'compressing', progress: 0 } : f
    ))

    /* Spawn one worker per file — run in parallel */
    toCompress.forEach(f => {
      if (workers.current.has(f.id)) return

      const worker = new Worker(
        new URL('../../../../workers/compression.worker.js', import.meta.url),
        { type: 'module' }
      )
      workers.current.set(f.id, worker)

      worker.onmessage = ({ data }) => {
        switch (data.type) {
          case 'progress':
            patch(f.id, { progress: data.progress })
            break

          case 'done': {
            const url = URL.createObjectURL(data.result.blob)
            patch(f.id, {
              status:   'done',
              progress: 100,
              result:   {
                ...data.result,
                url,
                originalSize: f.size,
              },
            })
            workers.current.delete(f.id)
            worker.terminate()
            break
          }

          case 'error':
            patch(f.id, { status: 'error', error: data.error, progress: 0 })
            workers.current.delete(f.id)
            worker.terminate()
            break
        }
      }

      worker.onerror = e => {
        patch(f.id, { status: 'error', error: e.message ?? 'Worker crashed', progress: 0 })
        workers.current.delete(f.id)
        worker.terminate()
      }

      worker.postMessage({ id: f.id, file: f.file, settings: chosen.settings })
    })
  }, [files, preset, patch])

  /* ── Start over ───────────────────────────────────────────────────── */
  const handleStartOver = useCallback(() => {
    workers.current.forEach(w => w.terminate())
    workers.current.clear()

    setFiles(prev => {
      prev.forEach(f => {
        if (f.beforeUrl)   URL.revokeObjectURL(f.beforeUrl)
        if (f.result?.url) URL.revokeObjectURL(f.result.url)
      })
      return []
    })

    setLimitWarn(false)
    savedRef.current = false
  }, [])

  /* ── Download all as ZIP ──────────────────────────────────────────── */
  const handleDownloadZip = useCallback(() => {
    downloadZip(doneFiles)
  }, [downloadZip, doneFiles])

  /* ════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Drop zone ─────────────────────────────────────────────── */}
      <DropZone
        onFiles={handleDrop}
        hasFiles={hasFiles}
        compressing={anyCompressing} />

      {/* ── Limit warning ─────────────────────────────────────────── */}
      {limitWarn && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          padding:      '8px 12px',
          borderRadius: 'var(--r-sm)',
          background:   'var(--error-bg)',
          border:       '1px solid rgba(255,107,107,.2)',
        }}>
          <WarningIcon />
          <p style={{ fontSize: '.75rem', color: 'var(--error)', margin: 0 }}>
            Smart mode supports up to {FREE_LIMIT} images for free users.
            {' '}
            <span style={{ color: 'var(--t-tertiary)' }}>
              Upgrade to Pro for unlimited.
            </span>
          </p>
        </div>
      )}

      {/* ── Staged file list (idle files only) ────────────────────── */}
      {idleFiles.length > 0 && (
        <StagedList
          files={idleFiles}
          total={files.length}
          limit={SMART_LIMIT}
          isPaid={isPaid}
          onRemove={handleRemove} />
      )}

      {/* ── Preset picker ─────────────────────────────────────────── */}
      {idleFiles.length > 0 && (
        <PresetPicker
          selected={preset}
          onSelect={setPreset}
          presetSizes={presetSizes}
          totalOriginal={idleFiles.reduce((s, f) => s + f.size, 0)}
          estimating={estimating} />
      )}

      {/* ── Compress CTA ──────────────────────────────────────────── */}
      {idleFiles.length > 0 && !anyCompressing && (
        <CompressButton count={idleFiles.length} onClick={handleCompress} />
      )}

      {/* ── Results grid (compressing + done + error) ─────────────── */}
      {files.some(f => f.status !== 'idle') && (
        <ResultsGrid files={files} onRemove={handleRemove} />
      )}

      {/* ── Bottom action bar ─────────────────────────────────────── */}
      {allSettled && doneFiles.length > 0 && (
        <BottomBar
          savedPct={totalSavingsPct}
          origBytes={totalOrigBytes}
          compBytes={totalCompBytes}
          doneCount={doneFiles.length}
          autoDownload={autoDownload}
          onAutoDownload={setAutoDownload}
          onZip={handleDownloadZip}
          onStartOver={handleStartOver} />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════════════ */

/* ── Staged file list ───────────────────────────────────────────────── */
function StagedList({ files, total, limit, isPaid, onRemove }) {
  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '7px 13px',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--surface-2)',
      }}>
        <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--t-secondary)' }}>
          {files.length} image{files.length !== 1 ? 's' : ''} ready
        </span>
        <span style={{ fontSize: '.64rem', color: 'var(--t-tertiary)' }}>
          {isPaid
            ? <span style={{ color: 'var(--c)', fontWeight: 600 }}>Unlimited</span>
            : `${limit - total} of ${limit} slots free`}
        </span>
      </div>

      {/* File rows */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {files.slice(0, 10).map((f, i) => (
          <li key={f.id} style={{
            display:      'flex',
            alignItems:   'center',
            gap:          10,
            padding:      '7px 13px',
            borderBottom: i < Math.min(files.length, 10) - 1
              ? '1px solid var(--border)' : 'none',
          }}>
            {/* Thumbnail */}
            {f.beforeUrl && (
              <img src={f.beforeUrl} alt="" style={{
                width: 32, height: 32,
                objectFit:    'cover',
                borderRadius: 5,
                border:       '1px solid var(--border)',
                flexShrink:   0,
              }} />
            )}

            {/* Name */}
            <span style={{
              flex:          1,
              fontSize:      '.75rem',
              color:         'var(--t-primary)',
              overflow:      'hidden',
              textOverflow:  'ellipsis',
              whiteSpace:    'nowrap',
            }}>
              {f.name}
            </span>

            {/* Size */}
            <span style={{ fontSize: '.68rem', color: 'var(--t-tertiary)', flexShrink: 0 }}>
              {formatBytes(f.size)}
            </span>

            {/* Remove */}
            <button
              onClick={() => onRemove(f.id)}
              title="Remove"
              className="btn btn-icon"
              style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0 }}>
              <XIcon />
            </button>
          </li>
        ))}

        {files.length > 10 && (
          <li style={{
            padding:    '6px 13px',
            fontSize:   '.68rem',
            color:      'var(--t-tertiary)',
            borderTop:  '1px solid var(--border)',
          }}>
            +{files.length - 10} more images
          </li>
        )}
      </ul>
    </div>
  )
}

/* ── Compress CTA ───────────────────────────────────────────────────── */
function CompressButton({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-primary btn-block"
      style={{ padding: '14px', fontSize: '.95rem', borderRadius: 'var(--r-md)' }}>
      <LeafIcon />
      {count > 1 ? `Compress ${count} images` : 'Compress image'}
    </button>
  )
}

/* ── Bottom action bar ──────────────────────────────────────────────── */
function BottomBar({
  savedPct, origBytes, compBytes, doneCount,
  autoDownload, onAutoDownload, onZip, onStartOver,
}) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      flexWrap:       'wrap',
      gap:            10,
      padding:        '12px 14px',
      background:     'var(--c-bg)',
      border:         '1px solid var(--c-border)',
      borderRadius:   'var(--r-md)',
    }}>
      {/* Stats */}
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '.85rem', color: 'var(--c)' }}>
          {savedPct > 0 ? `−${savedPct}% saved` : 'Compressed'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '.7rem', color: 'var(--t-tertiary)' }}>
          {formatBytes(origBytes)} → {formatBytes(compBytes)}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Auto-download toggle */}
        <label style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          fontSize:   '.72rem',
          color:      'var(--t-secondary)',
          cursor:     'pointer',
          userSelect: 'none',
        }}>
          <div
            className="toggle"
            onClick={() => onAutoDownload(!autoDownload)}
            style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={e => onAutoDownload(e.target.checked)}
              tabIndex={-1} />
            <div className="toggle-track">
              <div className="toggle-thumb" />
            </div>
          </div>
          Auto-download
        </label>

        <button onClick={onStartOver} className="btn btn-ghost btn-sm">
          Start over
        </button>

        {doneCount > 1 && (
          <button onClick={onZip} className="btn btn-primary btn-sm">
            <DownloadIcon />
            Download ZIP
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────────────── */
const LeafIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M7 13C7 13 2 10 2 6C2 3.8 4.2 2 7 2s5 1.8 5 4C12 10 7 13 7 13Z"
      fill="rgba(0,0,0,.2)"/>
    <path d="M7 13V6" strokeOpacity=".6"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 1.5v7M3.5 6l3 3 3-3"/><path d="M1.5 11h10"/>
  </svg>
)
const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M1 1l8 8M9 1L1 9"/>
  </svg>
)
const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
       stroke="var(--error)" strokeWidth="1.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <path d="M7 1.5L13 12H1L7 1.5z"/>
    <path d="M7 5.5v3M7 10.5h.01"/>
  </svg>
)
