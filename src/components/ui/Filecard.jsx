// src/components/ui/Filecard.jsx
// Status-aware file card used in Smart mode's staged list and any file queue.
// States: idle | compressing | done | error
import { useState } from 'react'
import { formatBytes, savingsPercent } from '../../utils/formatBytes'

export default function FileCard({ file, onRemove, onRetry, onDownload, onCopy, onRename }) {
  const {
    id, name = '', size = 0, status, progress = 0,
    result, error, info, outputName, beforeUrl,
  } = file ?? {}

  const baseName    = name.replace(/\.[^/.]+$/, '') || 'Untitled'
  const displayName = outputName || name || 'Untitled'
  const savings     = result?.compressedSize ? savingsPercent(size, result.compressedSize) : null
  const showSavings = typeof savings === 'number' && savings > 0
  const safeProgress= Math.min(100, Math.max(0, progress ?? 0))

  const [editing,  setEditing]  = useState(false)
  const [nameVal,  setNameVal]  = useState(outputName ?? baseName)
  const [showInfo, setShowInfo] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const commitRename = () => { setEditing(false); onRename?.(id, nameVal) }

  const handleCopy = async () => {
    try {
      const ok = await onCopy?.(id)
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
    } catch {
        // Ignore copy errors (e.g. permissions, unsupported formats)
    }
  }

  const isDone       = status === 'done'
  const isCompressing= status === 'compressing'
  const isError      = status === 'error'

  return (
    <div style={{
      borderRadius: 'var(--r-md)',
      border:       `1px solid ${isDone ? 'var(--c-mist)' : 'var(--c-clay)'}`,
      background:   isDone ? 'var(--c-fog)' : 'var(--c-cream)',
      overflow:     'hidden',
      boxShadow:    'var(--shadow-xs)',
      transition:   'background var(--t-slow), border-color var(--t-slow)',
    }}>

      {/* ── Main row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>

        {/* Thumbnail */}
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--r-sm)', flexShrink: 0,
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--c-sand)',
          border: '1px solid var(--c-clay)',
        }}>
          {result?.url
            ? <img src={result.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : beforeUrl
              ? <img src={beforeUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isCompressing ? .6 : 1 }} />
              : <LeafThumb />
          }
        </div>

        {/* Name + status ────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false) }}
              style={{
                width: '100%', fontFamily: 'var(--font-ui)', fontSize: '.8rem',
                padding: '2px 6px', borderRadius: 4,
                border: '1px solid var(--c-canopy)', background: 'var(--c-cream)',
                color: 'var(--c-text)', outline: 'none', boxSizing: 'border-box',
              }} />
          ) : (
            <p
              onClick={() => { setEditing(true); setNameVal(outputName ?? baseName) }}
              title="Click to rename"
              style={{
                fontSize: '.8rem', fontWeight: 500, color: 'var(--c-text)',
                margin: 0, cursor: 'text', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
              {displayName}
            </p>
          )}

          {/* Sub-line */}
          <div style={{ marginTop: 3 }}>
            {isCompressing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  flex: 1, height: 3, borderRadius: 99,
                  background: 'var(--c-clay)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: 'var(--c-canopy)',
                    width: `${safeProgress}%`,
                    transition: 'width .15s ease',
                  }} />
                </div>
                <span style={{ fontSize: '.65rem', fontWeight: 600,
                               color: 'var(--c-canopy)', minWidth: 26, textAlign: 'right',
                               fontVariantNumeric: 'tabular-nums' }}>
                  {safeProgress}%
                </span>
              </div>
            )}
            {status === 'idle' && (
              <span style={{ fontSize: '.7rem', color: 'var(--c-text-3)' }}>
                {formatBytes(size)} · ready
              </span>
            )}
            {isDone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.7rem', color: 'var(--c-text-3)' }}>
                  {formatBytes(size)}
                </span>
                <span style={{ color: 'var(--c-stone)', fontSize: '.65rem' }}>→</span>
                <span style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--c-canopy)' }}>
                  {formatBytes(result?.compressedSize ?? 0)}
                </span>
                {result?.width && (
                  <span style={{ fontSize: '.65rem', color: 'var(--c-stone)' }}>
                    {result.width}×{result.height}
                  </span>
                )}
              </div>
            )}
            {isError && (
              <span style={{ fontSize: '.7rem', color: 'var(--c-error)' }}>
                {error || 'Compression failed'}
              </span>
            )}
          </div>
        </div>

        {/* Right-side actions ──────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {showSavings && (
            <span style={{
              fontSize: '.65rem', fontWeight: 700,
              padding: '2px 7px', borderRadius: 99, marginRight: 4,
              background: 'rgba(25,56,38,.1)', color: 'var(--c-forest)',
            }}>
              -{savings}%
            </span>
          )}
          {(info || result) && (
            <IconBtn active={showInfo} title="File info" onClick={() => setShowInfo(v => !v)}>
              <InfoIcon />
            </IconBtn>
          )}
          {isDone && (
            <IconBtn title={copied ? 'Copied!' : 'Copy'} onClick={handleCopy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </IconBtn>
          )}
          {isDone && result?.url && (
            <IconBtn accent title="Download" onClick={() => onDownload?.(id)}>
              <DownloadIcon />
            </IconBtn>
          )}
          {isError && (
            <IconBtn title="Retry" onClick={() => onRetry?.(id)}>
              <RetryIcon />
            </IconBtn>
          )}
          <IconBtn danger title="Remove" onClick={() => onRemove?.(id)}>
            <XIcon />
          </IconBtn>
        </div>
      </div>

      {/* ── Info panel ────────────────────────────────────────────────── */}
      {showInfo && (info || result) && (
        <div style={{
          borderTop: '1px solid var(--c-sand)',
          padding: '8px 12px 10px',
          background: 'var(--c-sand)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
            {info && <>
              <InfoRow label="Original"     value={`${info.width} × ${info.height}px`} />
              <InfoRow label="Format"       value={info.format?.replace('image/', '').toUpperCase() ?? '—'} />
              <InfoRow label="File size"    value={formatBytes(info.size)} />
              <InfoRow label="Transparency" value={info.hasAlpha ? 'Yes' : 'No'} />
            </>}
            {result && <>
              <InfoRow label="Output"     value={`${result.width} × ${result.height}px`} />
              <InfoRow label="Out format" value={result.outputMime?.replace('image/', '').toUpperCase() ?? '—'} />
              <InfoRow label="Out size"   value={formatBytes(result.compressedSize)} />
              <InfoRow label="Saved"      value={showSavings ? `${savings}%` : '—'} accent={showSavings} />
            </>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Subcomponents ─────────────────────────────────────────────────────────── */

function InfoRow({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '2px 0' }}>
      <span style={{ fontSize: '.65rem', color: 'var(--c-text-3)' }}>{label}</span>
      <span style={{ fontSize: '.65rem', fontWeight: 600,
                     color: accent ? 'var(--c-canopy)' : 'var(--c-text)' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function IconBtn({ children, onClick, title, active, accent, danger }) {
  const color = active ? 'var(--c-forest)'
    : accent ? 'var(--c-forest)'
    : 'var(--c-stone)'

  return (
    <button
      onClick={onClick} title={title}
      style={{
        width: 28, height: 28, borderRadius: 6,
        border: 'none', background: active ? 'rgba(25,56,38,.08)' : 'transparent',
        color, cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', transition: 'all var(--t-fast)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color      = danger ? 'var(--c-error)' : 'var(--c-forest)'
        e.currentTarget.style.background = danger ? 'rgba(191,59,59,.07)' : 'rgba(25,56,38,.07)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color      = color
        e.currentTarget.style.background = active ? 'rgba(25,56,38,.08)' : 'transparent'
      }}>
      {children}
    </button>
  )
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const LeafThumb = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 15C9 15 3 11 3 6.5C3 4 5.7 2 9 2c3.3 0 6 2 6 4.5C15 11 9 15 9 15Z"
      fill="#4BB872" fillOpacity=".22" stroke="#4BB872" strokeWidth="1.2"/>
    <path d="M9 15V7" stroke="#7A5F48" strokeWidth="1" strokeLinecap="round"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1.5v8M4 7l3 3 3-3"/><path d="M1.5 12h11"/>
  </svg>
)
const RetryIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 6.5a4.5 4.5 0 1 0 .9-2.7"/><path d="M2 2v3h3" strokeLinejoin="round"/>
  </svg>
)
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M1 1l10 10M11 1L1 11"/>
  </svg>
)
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="7" cy="7" r="5.5"/><path d="M7 6.5v3.5M7 5h.01"/>
  </svg>
)
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="7.5" height="7.5" rx="1.5"/><path d="M2 9V2.5A.5.5 0 0 1 2.5 2H9"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--c-canopy)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7l3 3 6-6"/>
  </svg>
)
