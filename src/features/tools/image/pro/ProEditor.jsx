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
import { useDownloads }         from '../../../../hooks/useDownloads'
import { useAutoDownload }      from '../../../../hooks/useAutoDownload'
import { useCompressionWorker } from '../../../../hooks/useCompressionWorker'
import { useHistoryStore }      from '../../../../store/userHistoryStore'
import { useAuthStore }         from '../../../../store/useAuthStore'
import { useExportGate }        from '../../../../hooks/useExportGate'
import ModeDiscovery        from '../../../../components/ui/ModeDiscovery'
import { DEFAULT_PRO_SETTINGS } from '../../../../config/presets'
import { maybeDrawWatermark } from '../../../../lib/watermark'
import { formatBytes }          from '../../../../utils/formatBytes'

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

      /* Watermark — drawn LAST, exactly as the worker does it, so the
         preview is an honest picture of the file they'll actually get.
         Free users tuning sliders against a clean preview and then
         downloading a marked file is a bait-and-switch. */
      maybeDrawWatermark(ctx, w, h, settings)

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

        /* Cap upward only — estimate can never exceed original size. */
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

/* ══════════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export default function ProEditor({ onAuth }) {
  /* sessions: { id, file, name, size, beforeUrl,
                 settings, status, progress, result, error,
                 previewUrl, previewLoading, estimatedSize } */
  const [sessions,     setSessions]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [autoDownload, setAutoDownload] = useState(false)

  const savedRef    = useRef(false)
  const prevUrlsRef = useRef(new Map())  // id → last previewUrl to revoke

  const { downloadZip } = useDownloads()
  const { addBatch }    = useHistoryStore()

  const plan   = useAuthStore(s => s.plan)
  const isPaid = plan === 'pro' || plan === 'supporter'

  /* Single source of truth for "may this user export, and is it marked". */
  const { guard, canExport, isTrialUse, watermark } = useExportGate(onAuth)

  /* ── Derived ──────────────────────────────────────────────────── */
  const active    = sessions.find(s => s.id === activeId) ?? null
  const queue     = sessions.filter(s => s.id !== activeId)
  const doneFiles = sessions.filter(s => s.status === 'done')
  const allDone   = sessions.length > 0 && sessions.every(s =>
    s.status === 'done' || s.status === 'error'
  )
  const anyCompressing = sessions.some(s => s.status === 'compressing')
  const hasFiles       = sessions.length > 0

  /* Mirrors for use inside event handlers — lets handlers read current
     state without depending on it and without reading state inside a
     state updater (updaters must stay pure; StrictMode double-invokes). */
  const sessionsRef = useRef(sessions)
  const activeRef   = useRef(active)
  useEffect(() => { sessionsRef.current = sessions })
  useEffect(() => { activeRef.current   = active   })

  /* ── Patch a session ──────────────────────────────────────────── */
  const patch = useCallback((id, update) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...update } : s))
  }, [])

  /* ── Worker lifecycle (shared with Smart mode) ────────────────── */
  const { compress, cancel, cancelAll } = useCompressionWorker(patch)

  /* ── Auto-download ──────────────────────────────────────────────
     `canExport` in the enabled flag: auto-download was a second silent
     bypass — it fires downloadOne on every file reaching 'done', with no
     button and therefore no gate anywhere near it. */
  const autoFiles = sessions.map(s => ({
    id: s.id, status: s.status, name: s.name,
    outputName: null, size: s.size, result: s.result,
  }))
  useAutoDownload(autoFiles, autoDownload && canExport)

  /* ── History save ───────────────────────────────────────────────
     isPaid — not a hardcoded `true`. A free user demoing Pro mode gets the
     72h window; paid users get 2 weeks, matching the pricing page. */
  useEffect(() => {
    if (allDone && doneFiles.length && !savedRef.current) {
      savedRef.current = true
      addBatch(sessionsRef.current, isPaid)
    }
  }, [allDone, doneFiles.length, isPaid, addBatch])

  useEffect(() => {
    if (!hasFiles) savedRef.current = false
  }, [hasFiles])

  /* ── Revoke any outstanding preview URLs on unmount ───────────────
     (Worker termination is handled inside useCompressionWorker.) */
  useEffect(() => {
    const urls = prevUrlsRef.current
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  /*
   * ── Generate live preview (debounced 320ms) ───────────────────────
   *
   * The debounced function MUST be stable across renders. Recreating it
   * every render resets the timer, so the preview would never fire while
   * the user is dragging a slider. It's created once via useRef, and
   * reads the latest `patch` through patchRef.
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

  const triggerPreview = useCallback((id, file, settings) => {
    /* Preview reflects the SAME policy decision as the export, so what they
       see while tuning is exactly what lands on disk. In Pro mode under the
       current policy `watermark` is false for everyone — the export block is
       the gate here, not the mark. */
    generatePreview(id, file, { ...settings, watermark }, prevUrlsRef.current)
  }, [generatePreview, watermark])

  /* ── Drop files ───────────────────────────────────────────────────
     setActiveId is called AFTER setSessions, not inside its updater. */
  const handleDrop = useCallback((incoming) => {
    if (!incoming.length) return

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

    setSessions(prev => [...prev, ...newSessions])
    setActiveId(cur => cur ?? newSessions[0].id)
  }, [])

  /* ── Settings change → re-generate preview ────────────────────── */
  const handleSettingsChange = useCallback((patch_) => {
    const current = activeRef.current
    if (!current) return

    /* Merge before the state update so we can hand the *new* settings to
       triggerPreview. Calling triggerPreview inside the updater would be a
       side effect in a function React requires to be pure. */
    const newSettings = { ...current.settings, ...patch_ }

    setSessions(prev => prev.map(s =>
      s.id === current.id ? { ...s, settings: newSettings } : s
    ))

    triggerPreview(current.id, current.file, newSettings)
  }, [triggerPreview])

  /* Generate the initial preview whenever a different session opens */
  useEffect(() => {
    const s = sessionsRef.current.find(x => x.id === activeId)
    if (!s) return
    triggerPreview(s.id, s.file, s.settings)
  }, [activeId, triggerPreview])

  /* ── Compress & move to next ──────────────────────────────────────
     The hook flips status → 'compressing' and owns the worker. All we do
     here is fire it and advance the editor to the next unedited image. */
  const handleCompress = useCallback(() => {
    const current = activeRef.current
    if (!current || current.status !== 'editing') return

    /* Watermark comes from exportPolicy, not from a local isPaid check —
       one rule, one place. */
    compress(
      { id: current.id, file: current.file, size: current.size },
      { ...current.settings, watermark }
    )

    const next = sessionsRef.current.find(s =>
      s.id !== current.id && s.status === 'editing'
    )
    setActiveId(next?.id ?? null)
  }, [compress, watermark])

  /* ── Remove from queue ────────────────────────────────────────────
     Everything is computed from sessionsRef *before* any setState, so the
     next-active choice sees the post-removal list and nothing runs twice. */
  const handleRemove = useCallback((id) => {
    cancel(id)

    const current = sessionsRef.current
    const target  = current.find(s => s.id === id)

    if (target?.beforeUrl)   URL.revokeObjectURL(target.beforeUrl)
    if (target?.result?.url) URL.revokeObjectURL(target.result.url)

    const preview = prevUrlsRef.current.get(id)
    if (preview) URL.revokeObjectURL(preview)
    prevUrlsRef.current.delete(id)

    const remaining = current.filter(s => s.id !== id)
    setSessions(remaining)

    setActiveId(cur => {
      if (cur !== id) return cur   // removed a queued card — active unchanged
      const next = remaining.find(s => s.status === 'editing')
        ?? remaining.find(s => s.status === 'done')
        ?? remaining[0]
      return next?.id ?? null
    })
  }, [cancel])

  /* ── Start over ───────────────────────────────────────────────── */
  const handleStartOver = useCallback(() => {
    cancelAll()

    sessionsRef.current.forEach(s => {
      if (s.beforeUrl)   URL.revokeObjectURL(s.beforeUrl)
      if (s.result?.url) URL.revokeObjectURL(s.result.url)
    })
    prevUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    prevUrlsRef.current.clear()

    setSessions([])
    setActiveId(null)
    savedRef.current = false
  }, [cancelAll])

  /* ── Download all done as ZIP ─────────────────────────────────── */
  const handleZip = useCallback(() => {
    downloadZip(sessionsRef.current.filter(s => s.status === 'done'))
  }, [downloadZip])

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Drop zone */}
      <DropZone
        onFiles={handleDrop}
        hasFiles={hasFiles}
        compressing={anyCompressing} />

      {/* Empty state — same discovery card as Smart mode */}
      {!hasFiles && <ModeDiscovery />}

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
        <ProQueue sessions={queue} onRemove={handleRemove} onAuth={onAuth} />
      )}

      {/* All done bottom bar */}
      {allDone && doneFiles.length > 0 && (
        <DoneBar
          doneCount={doneFiles.length}
          autoDownload={autoDownload}
          onAutoDownload={setAutoDownload}
          onZip={guard(handleZip)}
          onStartOver={handleStartOver}
          canExport={canExport}
          isTrialUse={isTrialUse}
          isPaid={isPaid} />
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

/* ── Done bar ───────────────────────────────────────────────────────────
   Presentational only. It no longer decides anything about who may export —
   it renders what useExportGate already decided. The old version made that
   call itself inside its own onClick, which is exactly why the ProQueue
   download button and auto-download were able to walk around it. */
function DoneBar({
  doneCount, autoDownload, onAutoDownload,
  onZip, onStartOver, canExport, isTrialUse, isPaid,
}) {
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
        {!isPaid && isTrialUse && (
          <p style={{ fontSize:'.66rem', color:'var(--t-tertiary)', margin:'2px 0 0' }}>
            1 free Pro export remaining
          </p>
        )}
        {!canExport && (
          <p style={{ fontSize:'.66rem', color:'var(--warning)', margin:'2px 0 0' }}>
            Upgrade to Pro to download
          </p>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {isPaid && (
          <label style={{ display:'flex', alignItems:'center', gap:6,
                          fontSize:'.72rem', color:'var(--t-secondary)', cursor:'pointer' }}>
            <div className="toggle">
              <input type="checkbox" checked={autoDownload}
                onChange={e => onAutoDownload(e.target.checked)} />
              <div className="toggle-track"><div className="toggle-thumb"/></div>
            </div>
            Auto-download
          </label>
        )}

        <button onClick={onStartOver} className="btn btn-ghost btn-sm">
          Start over
        </button>

        <button
          onClick={onZip}
          className="btn btn-primary btn-sm"
          style={!canExport ? {
            background: 'var(--surface-2)',
            color:      'var(--c)',
            border:     '1px solid var(--c-border)',
          } : {}}>
          <DownloadIcon />
          {!canExport ? 'Upgrade to download' : 'Download ZIP'}
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
