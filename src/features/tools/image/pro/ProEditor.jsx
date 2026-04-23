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

/* Render a downscaled preview — returns { url, size } */
async function renderPreview(file, settings) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const src = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(src)

      /* ── High-quality bypass (no processing) ── */
      const isHighQuality =
        (settings.quality ?? 1) >= 0.98 &&
        !settings.blurRadius &&
        !settings.sharpenAmount &&
        settings.resizeMode === 'none'

      if (isHighQuality) {
        resolve({
          url: URL.createObjectURL(file),
          estimatedSize: file.size,
        })
        return
      }

      /* ── Resize (preview-friendly, not destructive) ── */
      const MAX = 1200
      const scale = Math.min(
        MAX / img.naturalWidth,
        MAX / img.naturalHeight,
        1
      )

      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      /* ── Blur (native canvas filter) ── */
      const blur = settings.blurRadius || 0
      if (blur > 0) {
        ctx.filter = `blur(${blur}px)`
      }

      ctx.drawImage(img, 0, 0, w, h)
      ctx.filter = 'none'

      /* ── Sharpen (custom kernel) ── */
      if ((settings.sharpenAmount || 0) > 0) {
        applySharpen(ctx, w, h, settings.sharpenAmount)
      }

      /* ── Format handling ── */
      const mimeMap = {
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        png: 'image/png',
        avif: 'image/avif',
      }

      let mime = mimeMap[settings.outputFormat] || file.type

      /* AVIF fallback (canvas support is inconsistent) */
      const supportsAvif = canvas.toDataURL('image/avif').startsWith('data:image/avif')
      if (mime === 'image/avif' && !supportsAvif) {
        mime = 'image/webp'
      }

      /* Quality (ignored for PNG) */
      const quality =
        mime === 'image/png'
          ? undefined
          : Math.max(0.01, Math.min(1, settings.quality ?? 0.82))

      /* ── Encode preview ── */
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Preview failed'))
            return
          }

          /* Estimate full-size output */
          const estimatedSize =
            scale < 1
              ? Math.round(blob.size / (scale * scale))
              : blob.size

          resolve({
            url: URL.createObjectURL(blob),
            estimatedSize,
          })
        },
        mime,
        quality
      )
    }

    img.onerror = reject
    img.src = src
  })
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

  /* ── Generate live preview (debounced 320ms) ──────────────────── */
 const debouncedPreviewRef = useRef(null)

useEffect(() => {
  debouncedPreviewRef.current = debounce(async (id, file, settings) => {
    patch(id, { previewLoading: true })

    try {
      const { url, estimatedSize } = await renderPreview(file, settings)

      const prev = prevUrlsRef.current.get(id)
      if (prev) URL.revokeObjectURL(prev)

      prevUrlsRef.current.set(id, url)

      patch(id, {
        previewUrl: url,
        estimatedSize,
        previewLoading: false,
      })
    } catch {
      patch(id, { previewLoading: false })
    }
  }, 320)

  return () => {
    // cleanup debounce timer
    debouncedPreviewRef.current = null
  }
}, [patch])

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
      /* Open first new session if none active */
      setActiveId(a => a ?? newSessions[0]?.id)
      return next
    })
  }, [])

  /* ── Settings change → re-generate preview ────────────────────── */
  const handleSettingsChange = useCallback((patch_) => {
    if (!activeId) return
    setSessions(prev => {
      const next = prev.map(s =>
        s.id === activeId
          ? { ...s, settings: { ...s.settings, ...patch_ } }
          : s
      )
      const sess = next.find(s => s.id === activeId)
      if (sess) debouncedPreviewRef.current?.(sess.id, sess.file, sess.settings)
      return next
    })
  }, [activeId, debouncedPreviewRef])

  /* Generate initial preview when activeId changes */
  useEffect(() => {
    if (!active) return
    debouncedPreviewRef.current?.(active.id, active.file, active.settings)
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
    setActiveId(a => a === id ? null : a)
  }, [])

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
          onCancel={handleStartOver}
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
function EditorPanel({ session, onSettingsChange, onCompress, onCancel, hasNext }) {
  const { name, size, beforeUrl, previewUrl, previewLoading,
          settings, estimatedSize } = session

  const savings = estimatedSize && size
    ? Math.round((1 - estimatedSize / size) * 100)
    : null

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
            {estimatedSize && (
              <>
                <span style={{ color: 'var(--border-3)', fontSize: '.65rem' }}>→</span>
                <span style={{
                  fontSize:   '.78rem',
                  fontWeight: 700,
                  color:      savings > 0 ? 'var(--c)' : 'var(--t-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ~{formatBytes(estimatedSize)}
                </span>

                {/* Savings badge */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  
            {/* Cancel / Close */}
            <button
              onClick={() => {if (confirm('Discard all images?')){
                onCancel()
              }
              }}
              className="btn btn-ghost btn-sm"
              title="Cancel and go back"
              style={{
                width: 28,
                height: 28,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                fontSize: 16,
                lineHeight: 1,
                 color: 'var(--t-secondary)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--t-secondary)'}
              >
              ×
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
