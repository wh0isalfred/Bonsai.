/**
 * src/features/tools/image/smart/ResultsGrid.jsx
 *
 * Shows ALL files (compressing + done + error) in a horizontal scroll row.
 * Compressing cards: leaf-fall animation over original image + progress bar.
 * Done cards:        before/after photo flip + savings badge + download.
 * Expanded card:     clicks open a full-width ImageCompare drag slider below the row.
 *
 * Props:
 *   files  FileEntry[]  — all file entries from SmartCompressor state
 */
import { useState, useCallback } from 'react'
import ImageCompare from '../../../../components/ui/ImageCompare'
import { useDownloads } from '../../../../hooks/useDownloads'
import { formatBytes } from '../../../../utils/formatBytes'

const MIME_LABEL = {
  'image/jpeg': 'JPG', 'image/webp': 'WebP',
  'image/png':  'PNG', 'image/avif': 'AVIF',
}

function pct(orig, comp) {
  if (!orig || !comp || comp >= orig) return 0
  return Math.round((1 - comp / orig) * 100)
}

export default function ResultsGrid({ files, onRemove }) {
  // hooks FIRST, unconditionally
  const [expandedId, setExpandedId] = useState(null)

  const active = files.filter(f =>
    f.status === 'compressing' || f.status === 'done' || f.status === 'error'
  )

  const handleCardClick = useCallback((file) => {
    if (file.status !== 'done') return
    setExpandedId(prev => prev === file.id ? null : file.id)
  }, [])

  const handleRemove = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : prev)
    onRemove?.(id)
  }, [onRemove])

  if (!active.length) return null

  const expandedFile = active.find(f => f.id === expandedId && f.status === 'done')

  const doneCount  = active.filter(f => f.status === 'done').length
  const totalCount = active.length

  return (
    <div>
      <p style={{
        fontSize:      '.6rem',
        fontWeight:    700,
        letterSpacing: '.11em',
        textTransform: 'uppercase',
        color:         'var(--c)',
        margin:        '0 0 .65rem',
      }}>
        {doneCount < totalCount
          ? `Compressing — ${doneCount} / ${totalCount} done`
          : `Results — ${doneCount} image${doneCount !== 1 ? 's' : ''} compressed`}
      </p>

      <div className="h-scroll" style={{ paddingBottom: 6 }}>
        {active.map(f => (
          <ResultCard
            key={f.id}
            file={f}
            expanded={expandedId === f.id}
            onClick={handleCardClick}
            onRemove={handleRemove} />
        ))}
      </div>

      {expandedFile && (
        <ExpandedCompare
          file={expandedFile}
          onClose={() => setExpandedId(null)} />
      )}
    </div>
  )
}

/* ── Result card ────────────────────────────────────────────────────── */
function ResultCard({ file, expanded, onClick, onRemove }) {
  const { downloadOne } = useDownloads()
  const [side, setSide] = useState('after')

  const isDone        = file.status === 'done'
  const isCompressing = file.status === 'compressing'
  const isError       = file.status === 'error'
  const savings       = isDone ? pct(file.size, file.result?.compressedSize) : 0
  const fmt           = MIME_LABEL[file.result?.outputMime] ?? ''

  return (
    <div
      onClick={() => onClick(file)}
      style={{
        flexShrink:    0,
        width:         182,
        borderRadius:  'var(--r-md)',
        border:        `1px solid ${expanded ? 'var(--c-border)' : 'var(--border)'}`,
        background:    expanded ? 'var(--c-bg)' : 'var(--surface)',
        overflow:      'hidden',
        cursor:        isDone ? 'pointer' : 'default',
        transition:    'border-color var(--t-fast), background var(--t-fast)',
        position:      'relative',
      }}>

      {/* ── Remove button — top-right, always visible on hover ── */}
      <button
        onClick={e => { e.stopPropagation(); onRemove?.(file.id) }}
        title="Remove"
        style={{
          position:       'absolute',
          top:            6,
          left:           6,
          zIndex:         30,
          width:          22,
          height:         22,
          borderRadius:   'var(--r-xs)',
          border:         'none',
          background:     'rgba(14,17,16,.65)',
          color:          'rgba(255,255,255,.75)',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          transition:     'background var(--t-fast), color var(--t-fast)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,107,107,.8)'
          e.currentTarget.style.color      = '#fff'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(14,17,16,.65)'
          e.currentTarget.style.color      = 'rgba(255,255,255,.75)'
        }}>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
             stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M1 1l7 7M8 1L1 8"/>
        </svg>
      </button>

      {/* ── Image area ─────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 118, background: 'var(--surface-2)', overflow: 'hidden' }}>

        {/* Original image (always rendered, opacity toggles for flip) */}
        {file.beforeUrl && (
          <img src={file.beforeUrl} alt="Original" draggable={false} style={{
            position:   'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity:    (!isDone || side === 'before') ? 1 : 0,
            filter:     isCompressing ? 'brightness(.65)' : 'none',
            transition: isDone ? 'opacity .18s ease' : 'filter var(--t-base)',
          }} />
        )}

        {/* Compressed result (done state, after side) */}
        {isDone && file.result?.url && (
          <img src={file.result.url} alt="Compressed" draggable={false} style={{
            position:   'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity:    side === 'after' ? 1 : 0,
            transition: 'opacity .18s ease',
          }} />
        )}

        {/* ── Compressing overlay ─────────────────────────────── */}
        {isCompressing && (
          <CompressionOverlay progress={file.progress} />
        )}

        {/* ── Error overlay ────────────────────────────────────── */}
        {isError && (
          <div style={{
            position:       'absolute', inset: 0,
            background:     'rgba(14,17,16,.75)',
            display:        'flex', flexDirection: 'column',
            alignItems:     'center', justifyContent: 'center',
            gap:            6,
          }}>
            <ErrorIcon />
            <p style={{ fontSize: '.62rem', color: 'var(--error)',
                        textAlign: 'center', padding: '0 8px', margin: 0, lineHeight: 1.4 }}>
              {file.error ?? 'Failed'}
            </p>
          </div>
        )}

        {/* ── Savings badge (done) ─────────────────────────────── */}
        {isDone && savings > 0 && (
          <span style={{
            position:     'absolute', top: 7, right: 7,
            fontSize:     '.6rem', fontWeight: 800,
            padding:      '2px 7px', borderRadius: 99,
            background:   'var(--c)', color: 'var(--ink)',
            pointerEvents:'none',
          }}>
            −{savings}%
          </span>
        )}

        {/* ── Before / After flip toggle (done) ───────────────── */}
        {isDone && (
          <FlipToggle side={side} onFlip={s => { setSide(s) }} />
        )}

        {/* ── Expand hint (done) ───────────────────────────────── */}
        {isDone && !expanded && (
          <div style={{
            position:      'absolute', top: 7, left: 7,
            background:    'rgba(14,17,16,.55)',
            borderRadius:  4,
            padding:       '2px 5px',
            backdropFilter:'blur(4px)',
            pointerEvents: 'none',
          }}>
            <ExpandIcon />
          </div>
        )}

      </div>

      {/* ── Progress bar (compressing) ──────────────────────────── */}
      {isCompressing && (
        <div style={{ height: 2, background: 'var(--border)' }}>
          <div style={{
            height:     '100%',
            background: 'var(--c)',
            width:      `${file.progress ?? 0}%`,
            transition: 'width .25s ease',
          }} />
        </div>
      )}

      {/* ── Card footer ─────────────────────────────────────────── */}
      <div style={{ padding: '8px 10px 9px' }}>
        <p style={{
          fontSize:      '.7rem',
          fontWeight:    600,
          color:         'var(--t-primary)',
          margin:        '0 0 4px',
          whiteSpace:    'nowrap',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
        }} title={file.name}>
          {file.name}
        </p>

        {isDone && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <div style={{ fontSize: '.62rem', color: 'var(--t-secondary)', minWidth: 0 }}>
              <span style={{ color: 'var(--t-tertiary)' }}>{formatBytes(file.size)}</span>
              <span style={{ margin: '0 3px', color: 'var(--border-3)' }}>→</span>
              <span style={{ fontWeight: 700, color: 'var(--c)' }}>
                {formatBytes(file.result.compressedSize)}
              </span>
              {fmt && (
                <span style={{ marginLeft: 3, color: 'var(--t-tertiary)', fontSize: '.58rem' }}>
                  {fmt}
                </span>
              )}
            </div>

            <button
              onClick={e => { e.stopPropagation(); downloadOne(file) }}
              title="Download"
              style={{
                flexShrink:     0,
                width:          24, height: 24,
                borderRadius:   'var(--r-xs)',
                border:         'none',
                background:     'var(--c-bg)',
                color:          'var(--c)',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                transition:     'background var(--t-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--c-bg)'}>
              <DownloadIcon />
            </button>
          </div>
        )}

        {isCompressing && (
          <p style={{ fontSize: '.62rem', color: 'var(--t-tertiary)', margin: 0 }}>
            {file.progress ? `${file.progress}% — compressing` : 'Starting…'}
          </p>
        )}

        {isError && (
          <p style={{ fontSize: '.62rem', color: 'var(--error)', margin: 0 }}>
            Compression failed
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Before / After flip toggle ─────────────────────────────────────── */
function FlipToggle({ side, onFlip }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position:       'absolute',
        bottom:         7,
        left:           '50%',
        transform:      'translateX(-50%)',
        display:        'flex',
        borderRadius:   99,
        overflow:       'hidden',
        border:         '1px solid rgba(255,255,255,.18)',
        backdropFilter: 'blur(8px)',
        background:     'rgba(14,17,16,.55)',
        whiteSpace:     'nowrap',
      }}>
      {['before', 'after'].map(s => (
        <button
          key={s}
          onClick={() => onFlip(s)}
          style={{
            padding:    '3px 9px',
            fontSize:   '.59rem',
            fontWeight: 700,
            letterSpacing: '.03em',
            border:     'none',
            cursor:     'pointer',
            background: side === s ? 'rgba(255,255,255,.88)' : 'transparent',
            color:      side === s ? 'var(--ink)' : 'rgba(255,255,255,.65)',
            transition: 'background var(--t-fast), color var(--t-fast)',
          }}>
          {s === 'before' ? 'Before' : 'After'}
        </button>
      ))}
    </div>
  )
}

/* ── Compressing overlay with leaf particles ────────────────────────── */
function CompressionOverlay({ progress }) {
  return (
    <>
      <style>{`
        @keyframes rc-leaf {
          0%   { transform: translateY(-6px) rotate(-6deg); opacity: 0; }
          10%  { opacity: .9; }
          88%  { opacity: .4; }
          100% { transform: translateY(48px) rotate(65deg) scale(.6); opacity: 0; }
        }
        @keyframes rc-sway {
          0%,100% { margin-left: 0; }
          50%      { margin-left: 4px; }
        }
      `}</style>

      {/* Dim overlay */}
      <div style={{
        position:   'absolute', inset: 0,
        background: 'rgba(14,17,16,.38)',
      }} />

      {/* Leaf particles */}
      {[
        { left: '14%', dur: '1.65s', del: '0s',    sw: '.8s' },
        { left: '32%', dur: '2.0s',  del: '.22s',  sw: '.9s' },
        { left: '54%', dur: '1.8s',  del: '.44s',  sw: '.75s'},
        { left: '72%', dur: '1.9s',  del: '.14s',  sw: '1.0s'},
        { left: '86%', dur: '1.7s',  del: '.35s',  sw: '.85s'},
      ].map((p, i) => (
        <span key={i} style={{
          position:     'absolute',
          top:          0,
          left:         p.left,
          width:        5,
          height:       7,
          background:   'var(--c)',
          borderRadius: '50% 0 50% 50%',
          pointerEvents:'none',
          animation:    [
            `rc-leaf ${p.dur} ease-in ${p.del} infinite`,
            `rc-sway ${p.sw} ease-in-out ${p.del} infinite alternate`,
          ].join(', '),
        }} />
      ))}

      {/* Progress counter */}
      <div style={{
        position:       'absolute',
        bottom:         8,
        left:           '50%',
        transform:      'translateX(-50%)',
        fontSize:       '.62rem',
        fontWeight:     700,
        color:          'rgba(255,255,255,.8)',
        background:     'rgba(14,17,16,.6)',
        padding:        '2px 7px',
        borderRadius:   99,
        backdropFilter: 'blur(4px)',
        whiteSpace:     'nowrap',
      }}>
        {progress ?? 0}%
      </div>
    </>
  )
}

/* ── Expanded full-width compare ────────────────────────────────────── */
function ExpandedCompare({ file, onClose }) {
  const { downloadOne } = useDownloads()
  const savings = pct(file.size, file.result?.compressedSize)
  const fmt     = MIME_LABEL[file.result?.outputMime] ?? ''

  return (
    <div
      className="anim-fade-up"
      style={{
        marginTop:    10,
        background:   'var(--surface)',
        border:       '1px solid var(--c-border)',
        borderRadius: 'var(--r-lg)',
        overflow:     'hidden',
      }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '10px 14px',
        borderBottom:   '1px solid var(--border)',
        gap:            12,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--t-primary)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name}
          </p>
          <p style={{ fontSize: '.65rem', color: 'var(--t-tertiary)', margin: '2px 0 0' }}>
            {formatBytes(file.size)} →{' '}
            <span style={{ color: 'var(--c)', fontWeight: 700 }}>
              {formatBytes(file.result.compressedSize)}
            </span>
            {savings > 0 && (
              <span style={{
                marginLeft:  6, fontSize: '.58rem', fontWeight: 800,
                padding:     '1px 6px', borderRadius: 99,
                background:  'var(--c-bg-2)', color: 'var(--c)',
              }}>
                −{savings}%
              </span>
            )}
            {fmt && <span style={{ marginLeft: 5, color: 'var(--t-tertiary)' }}>{fmt}</span>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => downloadOne(file)}
            className="btn btn-primary btn-sm">
            Download
          </button>
          <button
            onClick={onClose}
            className="btn btn-icon"
            aria-label="Close comparison">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Compare slider */}
      <div style={{ padding: 14 }}>
        <ImageCompare
          before={file.beforeUrl}
          after={file.result.url} />
        <p style={{
          textAlign:  'center',
          fontSize:   '.62rem',
          color:      'var(--t-tertiary)',
          marginTop:  8,
        }}>
          Drag the handle to compare original ← → compressed
        </p>
      </div>
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────────────── */
const DownloadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 13 13" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 1.5v7M3.5 6l3 3 3-3"/><path d="M1.5 11h10"/>
  </svg>
)
const ExpandIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
       stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8"/>
  </svg>
)
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M2 2l9 9M11 2L2 11"/>
  </svg>
)
const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
       stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="10" cy="10" r="8"/>
    <path d="M10 6.5v4M10 13.5h.01"/>
  </svg>
)
