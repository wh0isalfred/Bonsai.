/**
 * src/features/tools/image/pro/ProEditor.jsx
 *
 * Pro mode orchestrator. Self-contained local state.
 *
 * UX flow:
 *  1. Drop images → first opens in editor immediately
 *  2. Adjust sliders → live preview updates (debounced 320ms)
 *  3. "Compress & next" → editor collapses to queue, next image opens
 *  4. Workers compress in background while user edits next image
 *  5. Queue cards show leaf animation while compressing
 *  6. All done → Download ZIP appears
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import DropZone       from '../../../../components/ui/DropZone'
import ImageCompare   from '../../../../components/ui/ImageCompare'
import EditorControls from './EditorControls'
import ProQueue       from './ProQueue'
import { useDownloads }    from '../../../../hooks/useDownloads'
import { useAutoDownload } from '../../../../hooks/useAutoDownload'
import { useHistoryStore } from '../../../../store/userHistoryStore'
import { useAuthStore }    from '../../../../store/useAuthStore'
import { useModeStore }    from '../../../../store/useModeStore'
import { DEFAULT_PRO_SETTINGS } from '../../../../config/presets'
import { formatBytes } from '../../../../utils/formatBytes'

let _seq = 0
const nextId = () => `pro_${Date.now()}_${++_seq}`

/* Debounce helper */
function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

/*
 * renderPreview — renders a live preview reflecting ALL current settings.
 * Returns { url: string, estimatedSize: number }.
 *
 * Quality:  applied to canvas.toBlob quality param
 * Blur:     applied via ctx.filter before drawImage
 * Sharpen:  5-tap unsharp mask on pixel data
 * Format:   jpeg/webp/png (avif falls back to webp if unsupported)
 *
 * Uses a 640px max-dimension thumbnail for speed (~5–20ms on modern devices).
 * Extrapolates full-resolution size via pixel-area ratio, capped at original.
 */
async function renderPreview(file, settings) {
  const MAX = 640
  return new Promise((resolve, reject) => {
    const img = new Image()
    const src = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(src)

      const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
      const w = Math.max(1, Math.round(img.naturalWidth  * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      /* Blur — apply before drawing via CSS filter */
      const blur = settings.blurRadius ?? 0
      if (blur > 0) {
        ctx.filter = `blur(${blur}px)`
        ctx.drawImage(img, 0, 0, w, h)
        ctx.filter = 'none'
      } else {
        ctx.drawImage(img, 0, 0, w, h)
      }

      /* Sharpen — 5-tap unsharp mask */
      const sharpen = settings.sharpenAmount ?? 0
      if (sharpen > 0) applyUnsharpMask(ctx, w, h, sharpen)

      /* Format */
      const fmt  = settings.outputFormat ?? 'webp'
      const mime = fmt === 'jpeg'     ? 'image/jpeg'
                 : fmt === 'png'      ? 'image/png'
                 : fmt === 'original' ? (file.type || 'image/webp')
                 : 'image/webp'   // webp / avif / auto all default to webp for preview

      /* Quality (ignored for PNG) */
      const q = mime === 'image/png'
        ? undefined
        : Math.max(0.01, Math.min(1, settings.quality ?? 0.82))

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Preview blob is null')); return }

        /* Cap upward only — estimate can never exceed original size.
           We don't use 0.98 because that clamps small-file estimates
           to a near-identical number regardless of quality setting. */
        const raw = scale < 1
          ? Math.round(blob.size / (scale * scale))
          : blob.size
        const estimatedSize = Math.min(raw, file.size)

        resolve({ url: URL.createObjectURL(blob), estimatedSize })
      }, mime, q)
    }

    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })
}

/* 5-tap unsharp mask (same algorithm as compression.worker.js) */
function applyUnsharpMask(ctx, w, h, amount) {
  const strength = Math.max(0, Math.min(5, amount)) * 0.6
  const src  = ctx.getImageData(0, 0, w, h)
  const orig = new Uint8ClampedArray(src.data)
  const d    = src.data
  const out  = ctx.createImageData(w, h)
  const od   = out.data

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i  = (y * w + x) * 4
      const n  = ((y-1)*w + x  ) * 4
      const s  = ((y+1)*w + x  ) * 4
      const e  = (y*w   + x+1  ) * 4
      const ww = (y*w   + x-1  ) * 4
      const ne = ((y-1)*w + x+1) * 4
      const nw = ((y-1)*w + x-1) * 4
      const se = ((y+1)*w + x+1) * 4
      const sw = ((y+1)*w + x-1) * 4
      for (let c = 0; c < 3; c++) {
        const blurred =
          d[i+c]*0.36 +
          (d[n+c]+d[s+c]+d[e+c]+d[ww+c])*0.12 +
          (d[ne+c]+d[nw+c]+d[se+c]+d[sw+c])*0.04
        od[i+c] = Math.round(Math.max(0, Math.min(255,
          orig[i+c] + strength * (orig[i+c] - blurred)
        )))
      }
      od[i+3] = d[i+3]
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y > 0 && y < h-1 && x > 0 && x < w-1) continue
      const i = (y*w+x)*4
      od[i]=d[i]; od[i+1]=d[i+1]; od[i+2]=d[i+2]; od[i+3]=d[i+3]
    }
  }
  ctx.putImageData(out, 0, 0)
}

export default function ProEditor({ onAuth }) {
  /* sessions: { id, file, name, size, beforeUrl,
                 settings, status, progress, result, error,
                 previewUrl, previewLoading, estimatedSize } */
  const [sessions,     setSessions]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [autoDownload, setAutoDownload] = useState(false)

  const workers       = useRef(new Map())
  const savedRef      = useRef(false)
  const previewTimer  = useRef(null)
  const prevUrlsRef   = useRef(new Map())  // id → last previewUrl to revoke

  const { downloadZip }  = useDownloads()
  const { addBatch }     = useHistoryStore()

  /* ── Derived ──────────────────────────────────────────────────── */
  const active    = sessions.find(s => s.id === activeId)
  const queue     = sessions.filter(s => s.id !== activeId)
  const doneFiles = sessions.filter(s => s.status === 'done')
  const allDone   = sessions.length > 0 && sessions.every(s =>
    s.status === 'done' || s.status === 'error'
  )
  const anyCompressing = sessions.some(s => s.status === 'compressing')

  /* ── Auto-download ────────────────────────────────────────────── */
  const autoFiles = sessions.map(s => ({
    id: s.id, status: s.status, name: s.name,
    outputName: null, size: s.size, result: s.result,
  }))
  useAutoDownload(autoFiles, autoDownload)

  /* ── History save ─────────────────────────────────────────────── */
  useEffect(() => {
    if (allDone && doneFiles.length && !savedRef.current) {
      savedRef.current = true
      addBatch(sessions, true /* isPro */)
    }
  }, [allDone]) // eslint-disable-line

  /* ── Cleanup on unmount ───────────────────────────────────────── */
  useEffect(() => () => {
    workers.current.forEach(w => w.terminate())
    clearTimeout(previewTimer.current)
  }, [])

  /* ── Patch a session ──────────────────────────────────────────── */
  const patch = useCallback((id, update) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...update } : s))
  }, [])

  /*
   * ── Generate live preview (debounced 320ms) ───────────────────────
   *
   * Critical: the debounce function MUST be stable across renders.
   * Wrapping debounce() inside useCallback recreates it on every render
   * which resets the timer and means the preview never fires while
   * the user is dragging a slider.
   *
   * Fix: store debounce in a ref so it's created once for the lifetime
   * of the component. We access the latest `patch` via a ref too.
   */
  const patchRef = useRef(patch)
  useEffect(() => { patchRef.current = patch }, [patch])

  const generatePreview = useRef(
    debounce(async (id, file, settings, prevUrlsMap) => {
      patchRef.current(id, { previewLoading: true })
      try {
        const { url, estimatedSize } = await renderPreview(file, settings)
        const prev = prevUrlsMap.get(id)
        if (prev) URL.revokeObjectURL(prev)
        prevUrlsMap.set(id, url)
        patchRef.current(id, { previewUrl: url, estimatedSize, previewLoading: false })
      } catch {
        patchRef.current(id, { previewLoading: false })
      }
    }, 320)
  ).current

  /* Convenience wrapper that passes prevUrlsRef automatically */
  const triggerPreview = useCallback((id, file, settings) => {
    generatePreview(id, file, settings, prevUrlsRef.current)
  }, [generatePreview])

  /*
   * Keep a ref to the active session so handleSettingsChange can read
   * the current file + settings synchronously without stale closure.
   * This avoids needing `sessions` as a dependency (which would cause
   * handleSettingsChange to recreate on every keystroke/slider move).
   */
  const activeRef = useRef(null)
  useEffect(() => { activeRef.current = active ?? null }, [active])

  /* ── Drop files ───────────────────────────────────────────────── */
  const handleDrop = useCallback((incoming) => {
    const newSessions = incoming.map(f => ({
      id:             nextId(),
      file:           f,
      name:           f.name,
      size:           f.size,
      type:           f.type,
      beforeUrl:      URL.createObjectURL(f),
      settings:       { ...DEFAULT_PRO_SETTINGS },
      status:         'editing',
      progress:       0,
      result:         null,
      error:          null,
      previewUrl:     null,
      previewLoading: false,
      estimatedSize:  null,
    }))

    setSessions(prev => {
      const next = [...prev, ...newSessions]
      setActiveId(a => a ?? newSessions[0]?.id)
      return next
    })
  }, [])

  /* ── Settings change → re-generate preview ────────────────────── */
  const handleSettingsChange = useCallback((patch_) => {
    if (!activeId || !activeRef.current) return

    /*
     * Merge the patch with current settings BEFORE the state update
     * so we can pass the correct new settings to triggerPreview.
     * Calling triggerPreview inside setSessions is not allowed —
     * state updater functions must be pure (no side effects).
     */
    const newSettings = { ...activeRef.current.settings, ...patch_ }

    /* 1. Update state */
    setSessions(prev => prev.map(s =>
      s.id === activeId
        ? { ...s, settings: newSettings }
        : s
    ))

    /* 2. Trigger preview with the new settings — outside the updater */
    triggerPreview(activeId, activeRef.current.file, newSettings)
  }, [activeId, triggerPreview])

  /* Generate initial preview when activeId changes */
  useEffect(() => {
    if (!active) return
    triggerPreview(active.id, active.file, active.settings)
  }, [activeId]) // eslint-disable-line

  /* ── Compress & move to next ──────────────────────────────────── */
  const handleCompress = useCallback(() => {
    if (!active || active.status !== 'editing') return

    patch(active.id, { status: 'compressing', progress: 0 })

    const worker = new Worker(
      new URL('../../../../workers/compression.worker.js', import.meta.url),
      { type: 'module' }
    )
    workers.current.set(active.id, worker)

    worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'progress':
          patch(active.id, { progress: data.progress })
          break
        case 'done': {
          const url = URL.createObjectURL(data.result.blob)
          patch(active.id, {
            status: 'done', progress: 100,
            result: { ...data.result, url, originalSize: active.size },
          })
          workers.current.delete(active.id)
          worker.terminate()
          break
        }
        case 'error':
          patch(active.id, { status: 'error', error: data.error })
          workers.current.delete(active.id)
          worker.terminate()
          break
      }
    }
    worker.onerror = e => {
      patch(active.id, { status: 'error', error: e.message ?? 'Worker crashed' })
      workers.current.delete(active.id)
      worker.terminate()
    }

    worker.postMessage({
      id:       active.id,
      file:     active.file,
      settings: active.settings,
    })

    /* Advance to next unedited session */
    setSessions(prev => {
      const next = prev.find(s => s.id !== active.id && s.status === 'editing')
      setActiveId(next?.id ?? null)
      return prev
    })
  }, [active, patch])

  /* ── Remove from queue ────────────────────────────────────────── */
  const handleRemove = useCallback((id) => {
    workers.current.get(id)?.terminate()
    workers.current.delete(id)
    const prev = prevUrlsRef.current.get(id)
    if (prev) URL.revokeObjectURL(prev)
    prevUrlsRef.current.delete(id)

    setSessions(prev => {
      const s = prev.find(x => x.id === id)
      if (s?.beforeUrl)   URL.revokeObjectURL(s.beforeUrl)
      if (s?.result?.url) URL.revokeObjectURL(s.result.url)
      return prev.filter(x => x.id !== id)
    })

    /* If we removed the active session, advance to the next editing one */
    setActiveId(current => {
      if (current !== id) return current  // wasn't active — no change

      /* Find next session to open from the current list before removal */
      const remaining = sessions.filter(s => s.id !== id)
      const next = remaining.find(s => s.status === 'editing')
        ?? remaining.find(s => s.status === 'done')
        ?? remaining[0]
        ?? null
      return next?.id ?? null
    })
  }, [sessions])

  /* ── Start over ───────────────────────────────────────────────── */
  const handleStartOver = useCallback(() => {
    workers.current.forEach(w => w.terminate())
    workers.current.clear()
    setSessions(prev => {
      prev.forEach(s => {
        if (s.beforeUrl)   URL.revokeObjectURL(s.beforeUrl)
        if (s.result?.url) URL.revokeObjectURL(s.result.url)
        const pv = prevUrlsRef.current.get(s.id)
        if (pv) URL.revokeObjectURL(pv)
      })
      return []
    })
    prevUrlsRef.current.clear()
    setActiveId(null)
    savedRef.current = false
  }, [])

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  const hasFiles = sessions.length > 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Drop zone */}
      <DropZone
        onFiles={handleDrop}
        hasFiles={hasFiles}
        compressing={anyCompressing} />

      {/* Active editor */}
      {active && (
        <EditorPanel
          key={active.id}
          session={active}
          onSettingsChange={handleSettingsChange}
          onCompress={handleCompress}
          onRemove={() => handleRemove(active.id)}
          hasNext={sessions.some(s => s.id !== active.id && s.status === 'editing')} />
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <ProQueue sessions={queue} onRemove={handleRemove} />
      )}

      {/* All done bottom bar */}
      {allDone && doneFiles.length > 0 && (
        <DoneBar
          doneCount={doneFiles.length}
          autoDownload={autoDownload}
          onAutoDownload={setAutoDownload}
          onZip={() => downloadZip(doneFiles.map(s => ({
            ...s, result: s.result,
          })))}
          onStartOver={handleStartOver}
          onAuth={onAuth} />
      )}
    </div>
  )
}

/* ── Editor panel ───────────────────────────────────────────────────── */
function EditorPanel({ session, onSettingsChange, onCompress, onRemove, hasNext }) {
  const { name, size, beforeUrl, previewUrl, previewLoading,
          settings, estimatedSize } = session

  const savings = estimatedSize != null && size
    ? Math.round((1 - estimatedSize / size) * 100)
    : null
  /* When estimate = original (high quality, already-compressed file) */
  const noReduction = savings !== null && savings <= 0

  return (
    <div
      className="panel-enter"
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        overflow:     'hidden',
      }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            12,
        padding:        '11px 16px',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--surface-2)',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize:     '.83rem',
            fontWeight:   600,
            color:        'var(--t-primary)',
            margin:       0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {name}
          </p>

          {/* Size row — the key information */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            marginTop:  4,
            flexWrap:   'wrap',
          }}>
            {/* Original size */}
            <span style={{ fontSize: '.7rem', color: 'var(--t-tertiary)' }}>
              {formatBytes(size)}
            </span>

            {/* Arrow + estimated size */}
            {estimatedSize != null && (
              <>
                <span style={{ color: 'var(--border-3)', fontSize: '.65rem' }}>→</span>
                <span style={{
                  fontSize:   '.78rem',
                  fontWeight: 700,
                  color:      !noReduction ? 'var(--c)' : 'var(--t-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ~{formatBytes(estimatedSize)}
                </span>

                {/* Savings badge — positive reduction only */}
                {savings > 0 && (
                  <span style={{
                    fontSize:      '.6rem',
                    fontWeight:    800,
                    padding:       '1px 6px',
                    borderRadius:  99,
                    background:    'var(--c-bg-2)',
                    color:         'var(--c)',
                    animation:     'fade-up .18s ease both',
                  }}>
                    −{savings}%
                  </span>
                )}

                {/* No-reduction note for already-compressed files */}
                {noReduction && (
                  <span style={{
                    fontSize:    '.62rem',
                    color:       'var(--t-tertiary)',
                    fontStyle:   'italic',
                  }}>
                    file already optimised
                  </span>
                )}
              </>
            )}

            {/* Loading spinner */}
            {previewLoading && (
              <span style={{
                display:    'flex',
                alignItems: 'center',
                gap:        4,
                fontSize:   '.62rem',
                color:      'var(--t-tertiary)',
              }}>
                <span className="spin" style={{
                  display:      'inline-block',
                  width:        9, height: 9,
                  borderRadius: '50%',
                  border:       '1.5px solid var(--border-2)',
                  borderTopColor: 'var(--c)',
                }} />
                {estimatedSize ? 'Updating…' : 'Calculating…'}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Remove this image */}
          <button
            onClick={onRemove}
            title="Remove image"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--t-tertiary)', padding: '6px 10px' }}
            onMouseEnter={e => {
              e.currentTarget.style.color       = 'var(--error)'
              e.currentTarget.style.borderColor = 'rgba(255,107,107,.3)'
              e.currentTarget.style.background  = 'var(--error-bg)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color       = 'var(--t-tertiary)'
              e.currentTarget.style.borderColor = 'var(--border-2)'
              e.currentTarget.style.background  = 'transparent'
            }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                 stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 2l9 9M11 2L2 11"/>
            </svg>
            Remove
          </button>

          {/* Compress */}
          <button
            onClick={onCompress}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}>
            <LeafIcon />
            {hasNext ? 'Compress & next' : 'Compress'}
          </button>
        </div>
      </div>

      {/* Body: compare + controls */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'minmax(0,1fr) 240px',
      }}
        className="pro-editor-body">
        <style>{`
          @media (max-width: 600px) {
            .pro-editor-body { grid-template-columns: 1fr !important; }
            .pro-editor-controls {
              border-left: none !important;
              border-top: 1px solid var(--border) !important;
              max-height: none !important;
            }
          }
        `}</style>

        {/* Left: live compare */}
        <div style={{ padding: 14, borderRight: '1px solid var(--border)' }}>
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   8,
          }}>
            <p style={{
              fontSize:      '.6rem',
              fontWeight:    700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color:         'var(--t-tertiary)',
              margin:        0,
            }}>
              Live preview
            </p>
            <p style={{ fontSize: '.62rem', color: 'var(--t-tertiary)', margin: 0 }}>
              ← drag handle →
            </p>
          </div>
          <ImageCompare
            before={beforeUrl}
            after={previewUrl ?? beforeUrl} />
        </div>

        {/* Right: controls — pass estimatedSize for the quality hint */}
        <div
          className="pro-editor-controls"
          style={{
            padding:        14,
            overflowY:      'auto',
            maxHeight:      520,
            borderLeft:     '1px solid var(--border)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border) transparent',
          }}>
          <EditorControls
            settings={settings}
            onChange={onSettingsChange}
            estimatedSize={estimatedSize} />
        </div>
      </div>
    </div>
  )
}

/* ── Done bar ───────────────────────────────────────────────────────── */
function DoneBar({ doneCount, autoDownload, onAutoDownload, onZip, onStartOver, onAuth }) {
  const plan    = useAuthStore(s => s.plan)
  const isPaid  = plan === 'pro' || plan === 'supporter'

  const { hasTrialExport, useTrial } = useModeStore()
  const hasTrial = hasTrialExport()

  /* Gate the zip download: paid users go straight through,
     free users with a trial get one download, others see auth modal */
  const handleZip = () => {
    if (isPaid) { onZip(); return }
    if (hasTrial) { useTrial(); onZip(); return }
    onAuth?.('upgrade')
  }

  return (
    <div
      className="card-enter"
      style={{
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
      <div>
        <p style={{ fontSize:'.84rem', fontWeight:700, color:'var(--c)', margin:0 }}>
          {doneCount} image{doneCount !== 1 ? 's' : ''} compressed
        </p>
        {!isPaid && hasTrial && (
          <p style={{ fontSize:'.66rem', color:'var(--t-tertiary)', margin:'2px 0 0' }}>
            1 free Pro export remaining
          </p>
        )}
        {!isPaid && !hasTrial && (
          <p style={{ fontSize:'.66rem', color:'var(--warning)', margin:'2px 0 0' }}>
            Upgrade to Pro to download
          </p>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {isPaid && (
          <label style={{ display:'flex', alignItems:'center', gap:6,
                          fontSize:'.72rem', color:'var(--t-secondary)', cursor:'pointer' }}>
            <label className="toggle">
              <input type="checkbox" checked={autoDownload}
                onChange={e => onAutoDownload(e.target.checked)} />
              <div className="toggle-track"><div className="toggle-thumb"/></div>
            </label>
            Auto-download
          </label>
        )}

        <button onClick={onStartOver} className="btn btn-ghost btn-sm">
          Start over
        </button>

        <button
          onClick={handleZip}
          className="btn btn-primary btn-sm"
          style={!isPaid && !hasTrial ? {
            background: 'var(--surface-2)',
            color:      'var(--c)',
            border:     '1px solid var(--c-border)',
          } : {}}>
          <DownloadIcon />
          {!isPaid && !hasTrial ? 'Upgrade to download' : 'Download ZIP'}
        </button>
      </div>
    </div>
  )
}

const LeafIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M7 13C7 13 2 10 2 6C2 3.8 4.2 2 7 2s5 1.8 5 4C12 10 7 13 7 13Z"
      fill="rgba(0,0,0,.18)"/>
    <path d="M7 13V6" strokeOpacity=".55"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 1.5v7M3.5 6l3 3 3-3"/><path d="M1.5 11h10"/>
  </svg>
)
