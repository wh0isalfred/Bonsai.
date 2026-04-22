/**
 * src/components/ui/DropZone.jsx
 *
 * Two modes:
 *   Empty (default)  — full bonsai tree hero with drag target
 *   Compact          — small strip with mini tree, shown when files are already staged
 *
 * Props:
 *   onFiles     (File[]) => void   — called with accepted image files
 *   hasFiles    boolean            — switches to compact mode
 *   compressing boolean            — shows compressing state on tree
 *   accept      string             — MIME/extension filter (defaults to images)
 *   maxMB       number             — max file size in MB (default 50)
 */
import { useCallback, useState, useRef } from 'react'

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif'
const DEFAULT_ACCEPT_STR = '.jpg,.jpeg,.png,.webp,.avif,.gif,image/*'

export default function DropZone({
  onFiles,
  hasFiles   = false,
  compressing = false,
  accept     = DEFAULT_ACCEPT,
  acceptStr  = DEFAULT_ACCEPT_STR,
  maxMB      = 50,
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef    = useRef(null)
  const dragCounter = useRef(0)

  const processFiles = useCallback((fileList) => {
    const maxBytes = maxMB * 1024 * 1024
    const accepted = accept.split(',').map(s => s.trim())

    const valid = Array.from(fileList).filter(f => {
      if (!f.type) return false
      const typeOk = accepted.some(a => {
        if (a.endsWith('/*')) return f.type.startsWith(a.slice(0, -1))
        return f.type === a || (a.startsWith('.') && f.name.toLowerCase().endsWith(a))
      })
      return typeOk && f.size <= maxBytes
    })

    if (valid.length) onFiles(valid)
  }, [onFiles, accept, maxMB])

  const onDragEnter = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }, [])

  const onDragOver = useCallback(e => { e.preventDefault() }, [])

  const onDrop = useCallback(e => {
    e.preventDefault()
    dragCounter.current = 0
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const onInputChange = useCallback(e => {
    processFiles(e.target.files)
    e.target.value = ''
  }, [processFiles])

  const openPicker = useCallback(e => {
    e.stopPropagation()
    inputRef.current?.click()
  }, [])

  /* ── Compact mode ──────────────────────────────────────────────── */
  if (hasFiles) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Add more images — drop here or click to browse"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         12,
          padding:     '10px 14px',
          borderRadius:'var(--r-md)',
          border:      `1.5px dashed ${dragging ? 'var(--c)' : 'var(--border)'}`,
          background:  dragging ? 'var(--c-bg)' : 'var(--surface)',
          cursor:      'pointer',
          userSelect:  'none',
          transition:  'border-color var(--t-base), background var(--t-base)',
          boxShadow:   dragging ? 'var(--shadow-c)' : 'none',
        }}>
        <input ref={inputRef} type="file" multiple accept={acceptStr}
               onChange={onInputChange} style={{ display: 'none' }} tabIndex={-1} />

        <MiniTree />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '.82rem', fontWeight: 600,
                      color: 'var(--t-primary)', margin: 0, lineHeight: 1.3 }}>
            {dragging ? 'Drop to add more' : 'Add more images'}
          </p>
          <p style={{ fontSize: '.69rem', color: 'var(--t-tertiary)', margin: '2px 0 0' }}>
            PNG · JPG · WebP · AVIF — up to {maxMB} MB
          </p>
        </div>

        <button
          onClick={openPicker}
          className="btn btn-secondary btn-sm"
          style={{ flexShrink: 0 }}>
          Browse
        </button>
      </div>
    )
  }

  /* ── Full empty state ──────────────────────────────────────────── */
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Image drop zone — drop images here or click to browse"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      style={{
        position:       'relative',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            20,
        padding:        'clamp(2rem, 5vw, 3rem) 1.5rem clamp(1.75rem, 4vw, 2.5rem)',
        borderRadius:   'var(--r-xl)',
        border:         `1.5px dashed ${dragging ? 'var(--c)' : 'var(--border-2)'}`,
        background:     dragging ? 'var(--c-bg)' : 'var(--surface)',
        cursor:         'pointer',
        userSelect:     'none',
        overflow:       'hidden',
        transition:     [
          'border-color var(--t-slow)',
          'background   var(--t-slow)',
          'box-shadow   var(--t-slow)',
        ].join(', '),
        boxShadow: dragging
          ? '0 0 0 4px rgba(125,235,160,.12), var(--shadow-md)'
          : 'var(--shadow-xs)',
      }}>

      {/* Celadon radial glow — bottom */}
      <div style={{
        position:       'absolute',
        inset:          0,
        background:     `radial-gradient(ellipse 65% 40% at 50% 110%, ${
          dragging ? 'rgba(125,235,160,.15)' : 'rgba(125,235,160,.06)'
        }, transparent)`,
        transition:     'background var(--t-slow)',
        pointerEvents:  'none',
      }} />

      <input ref={inputRef} type="file" multiple accept={acceptStr}
             onChange={onInputChange} style={{ display: 'none' }} tabIndex={-1} />

      {/* Bonsai tree */}
      <BonsaiTree dragging={dragging} compressing={compressing} />

      {/* Copy */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <p style={{
          fontSize:   'clamp(.9rem, 2.5vw, 1rem)',
          fontWeight: 700,
          color:      'var(--t-primary)',
          margin:     '0 0 4px',
          lineHeight: 1.25,
        }}>
          {dragging ? 'Release to add images' : 'Drop your images here'}
        </p>
        <p style={{ fontSize: '.78rem', color: 'var(--t-secondary)', margin: '0 0 2px' }}>
          Trim the size.{' '}
          <em style={{
            fontFamily: 'var(--font-brand)',
            fontStyle:  'italic',
            color:      'var(--c)',
            fontWeight: 600,
          }}>
            Keep the quality.
          </em>
        </p>
        <p style={{ fontSize: '.67rem', color: 'var(--t-tertiary)', margin: 0 }}>
          PNG · JPG · WebP · AVIF — up to {maxMB} MB each
        </p>
      </div>

      {/* Browse button */}
      <button
        type="button"
        onClick={openPicker}
        className="btn btn-primary"
        style={{
          position:      'relative',
          letterSpacing: '.01em',
          zIndex:         1,
        }}>
        Browse files
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   BONSAI TREE SVG
   Sumi palette — dark greens on dark surface, celadon apex glow.
   Animates:  idle sway (continuous), drag sway (faster), breathe (canopy)
   ══════════════════════════════════════════════════════════════════════ */
function BonsaiTree({ dragging, compressing }) {
  return (
    <>
      <style>{`
        /* ── Core sway (more noticeable, still calm) ─────────── */
        @keyframes dz-idle {
          0%,100% { transform: rotate(-1.2deg) translateX(0); }
          50%     { transform: rotate(1.2deg)  translateX(1.2px); }
        }

        @keyframes dz-drag {
          0%   { transform: rotate(-2.4deg) translateX(-1.5px); }
          100% { transform: rotate(2.4deg)  translateX(1.5px); }
        }

        /* ── Canopy life ─────────────────────────────────────── */
        @keyframes dz-breathe {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.03); }
        }

        @keyframes dz-canopy-drift {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(1.6px); }
        }

        /* ── Apex glow (subtle life pulse) ───────────────────── */
        @keyframes dz-apex-pulse {
          0%,100% { opacity: .22; transform: scale(1); }
          50%     { opacity: .38; transform: scale(1.08); }
        }

        /* ── Leaves ──────────────────────────────────────────── */
        @keyframes dz-leaf-fall {
          0%   { transform: translate(-2px, -6px) rotate(-8deg); opacity: 0; }
          20%  { opacity: .85; }
          100% { transform: translate(8px, 52px) rotate(75deg) scale(.65); opacity: 0; }
        }

        @keyframes dz-leaf-sway {
          0%,100% { margin-left: 0; }
          50%     { margin-left: 6px; }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          width: 100,
          height: 112,
          transformOrigin: '50% 100%',
          flexShrink: 0,
          position: 'relative',
          animation: dragging
            ? 'dz-drag .4s cubic-bezier(.42,0,.2,1) infinite alternate'
            : 'dz-idle 6s cubic-bezier(.42,0,.2,1) infinite',
        }}
      >
        <svg width="100" height="112" viewBox="0 0 130 145" fill="none">
          
          {/* Pot */}
          <path d="M44 132 L86 132 L90 142 L40 142 Z" fill="var(--ink-4)" opacity=".9"/>
          <rect x="38" y="126" width="54" height="8" rx="2" fill="var(--ink-3)"/>
          <rect x="36" y="121" width="58" height="7" rx="2" fill="var(--ink-4)" opacity=".8"/>

          {/* Shadow */}
          <ellipse cx="65" cy="124" rx="30" ry="3.5" fill="rgba(0,0,0,.3)"/>

          {/* Trunk */}
          <path d="M65 121 C64 110 66 100 65 90 C64 80 61 72 65 64 C68 57 63 51 65 44"
            stroke="var(--ink-5)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>

          {/* Branches */}
          <path d="M65 97 C57 91 47 87 37 77" stroke="var(--ink-5)" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M65 90 C73 84 83 80 93 70" stroke="var(--ink-5)" strokeWidth="3.5" strokeLinecap="round"/>

          {/* Foliage */}
          <g style={{
  animation: `
    dz-breathe 4.5s ease-in-out infinite,
    dz-canopy-drift 6s ease-in-out infinite
  `,
  transformOrigin: '65px 65px',
}}>
  {/* ── Upper canopy (main crown) ───────────────────────── */}
  <ellipse cx="65" cy="55" rx="24" ry="18" fill="#1C2E22" opacity=".9"/>
  <ellipse cx="65" cy="55" rx="18" ry="14" fill="#243B2A" opacity=".95"/>
  <ellipse cx="65" cy="51" rx="13" ry="10" fill="#2D4A33"/>
  <ellipse cx="65" cy="48" rx="9"  ry="7"  fill="#355240"/>

  {/* ── Left pads ───────────────────────────────────────── */}
  <ellipse cx="40" cy="70" rx="14" ry="11" fill="#1C2E22" opacity=".85"/>
  <ellipse cx="40" cy="70" rx="10" ry="8"  fill="#243B2A"/>
  <ellipse cx="40" cy="66" rx="6"  ry="5"  fill="#2D4A33"/>

  <ellipse cx="35" cy="90" rx="13" ry="10" fill="#1A2B20" opacity=".8"/>
  <ellipse cx="35" cy="90" rx="9"  ry="7"  fill="#223628"/>

  <ellipse cx="48" cy="88" rx="11" ry="9" fill="#1C2E22" opacity=".85"/>
  <ellipse cx="48" cy="88" rx="7.5" ry="6" fill="#243B2A"/>

  {/* ── Right pads ──────────────────────────────────────── */}
  <ellipse cx="90" cy="68" rx="14" ry="11" fill="#1C2E22" opacity=".85"/>
  <ellipse cx="90" cy="68" rx="10" ry="8"  fill="#243B2A"/>
  <ellipse cx="90" cy="64" rx="6"  ry="5"  fill="#2D4A33"/>

  <ellipse cx="92" cy="88" rx="12" ry="9" fill="#1A2B20" opacity=".8"/>
  <ellipse cx="92" cy="88" rx="8"  ry="6" fill="#223628"/>

  <ellipse cx="78" cy="92" rx="11" ry="8.5" fill="#1C2E22" opacity=".85"/>
  <ellipse cx="78" cy="92" rx="7.5" ry="5.5" fill="#243B2A"/>

  {/* ── Mid connectors (fills gaps naturally) ───────────── */}
  <ellipse cx="55" cy="72" rx="10" ry="8" fill="#1C2E22" opacity=".75"/>
  <ellipse cx="75" cy="75" rx="10" ry="8" fill="#1C2E22" opacity=".75"/>

  {/* ── Apex glow (same, but sits nicer now) ────────────── */}
  <ellipse cx="65" cy="34" rx="10" ry="8"
    fill="rgba(125,235,160,.12)"/>
  <ellipse cx="65" cy="34" rx="7" ry="5.5"
    fill="rgba(125,235,160,.16)"/>
  <ellipse cx="65" cy="30" rx="5" ry="4"
    fill="rgba(125,235,160,.22)"
    style={{ animation: 'dz-apex-pulse 3.5s ease-in-out infinite' }}
  />
  <ellipse cx="65" cy="27" rx="2.5" ry="2"
    fill="rgba(125,235,160,.35)"
    style={{ animation: 'dz-apex-pulse 3.5s ease-in-out infinite' }}
  />
</g>
        </svg>

        {/* Falling leaves */}
        {dragging && [
          { left: '15%', dur: '1.8s', delay: '0s' },
          { left: '35%', dur: '2.1s', delay: '.2s' },
          { left: '55%', dur: '1.9s', delay: '.4s' },
          { left: '75%', dur: '2.0s', delay: '.1s' },
        ].map((p, i) => (
          <span key={i} style={{
            position: 'absolute',
            top: 0,
            left: p.left,
            width: 5,
            height: 7,
            background: 'var(--c)',
            borderRadius: '50% 0 50% 50%',
            pointerEvents: 'none',
            animation: `
              dz-leaf-fall ${p.dur} ease-in ${p.delay} infinite,
              dz-leaf-sway .9s ease-in-out infinite alternate
            `,
          }} />
        ))}
      </div>
    </>
  )
}

/* ── Mini tree (compact mode icon) ─────────────────────────────────── */
function MiniTree() {
  return (
    <svg width="28" height="30" viewBox="0 0 40 44" fill="none" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <path d="M20 40 L20 29" stroke="var(--ink-5)" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="13" y="38" width="14" height="5" rx="1.5" fill="var(--ink-4)" opacity=".8"/>
      <ellipse cx="20" cy="21" rx="12" ry="10" fill="#1C2E22" opacity=".85"/>
      <ellipse cx="20" cy="21" rx="8.5" ry="7" fill="#243B2A" opacity=".9"/>
      <ellipse cx="20" cy="12" rx="6.5" ry="5.5" fill="#2D4A33"/>
      <ellipse cx="20" cy="8"  rx="4"   ry="3.5" fill="rgba(125,235,160,.22)"/>
      <ellipse cx="20" cy="6"  rx="2.5" ry="2"   fill="rgba(125,235,160,.35)"/>
    </svg>
  )
}
