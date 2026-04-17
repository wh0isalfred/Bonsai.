import { useState } from 'react'
import { formatBytes, savingsPercent } from '../hooks/formatBytes'

export default function FileCard({ file, onRemove, onRetry, onDownload, onCopy, onRename }) {
  const {
    id, name = '', size = 0, status, progress = 0,
    result, error, info, outputName,
  } = file || {}

  const baseName     = name.replace(/\.[^/.]+$/, '') || 'Untitled'
  const displayName  = outputName || name || 'Untitled'
  const savings      = result?.compressedSize ? savingsPercent(size, result.compressedSize) : null
  const showSavings  = typeof savings === 'number' && savings > 0
  const safeProgress = Math.min(100, Math.max(0, progress || 0))

  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState(outputName ?? baseName)
  const [showInfo,    setShowInfo]    = useState(false)
  const [copied,      setCopied]      = useState(false)

  const commitRename = () => { setEditingName(false); onRename?.(id, nameInput) }

  const handleCopy = async () => {
    try {
      const ok = await onCopy?.(id)
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
    } catch {
      // Ignore copy errors
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: status === 'done' ? '#F7FBF8' : '#fff', border: '1.5px solid #E8E4DC' }}>

      {/* ── Main row ── */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Thumbnail */}
        <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.15)' }}>
          {result?.url
            ? <img src={result.url} alt="" className="w-full h-full object-cover rounded-xl" />
            : <LeafIcon />
          }
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input autoFocus value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false) }}
              className="w-full text-sm px-2 py-0.5 rounded-lg border outline-none"
              style={{ borderColor: '#4CAF50', color: '#2A2A2A', fontFamily: 'inherit' }} />
          ) : (
            <p className="text-sm font-medium truncate leading-tight cursor-text"
              style={{ color: '#2A2A2A' }}
              onClick={() => { setEditingName(true); setNameInput(outputName ?? baseName) }}
              title="Click to rename">
              {displayName}
            </p>
          )}

          <div className="mt-0.5">
            {status === 'compressing' && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E4DC' }}>
                  <div className="h-full rounded-full transition-[width] duration-150"
                    style={{ width: `${safeProgress}%`, background: 'linear-gradient(90deg,#1F3D2B,#4CAF50)' }} />
                </div>
                <span className="text-[10px] font-medium tabular-nums w-7 text-right" style={{ color: '#1F3D2B' }}>
                  {safeProgress}%
                </span>
              </div>
            )}
            {status === 'idle' && (
              <span className="text-xs" style={{ color: '#6B4F3A' }}>{formatBytes(size)} · ready</span>
            )}
            {status === 'done' && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: '#6B4F3A' }}>
                <span>{formatBytes(size)}</span>
                <span style={{ color: '#D9D9D9' }}>→</span>
                <span className="font-bold" style={{ color: '#1F3D2B' }}>{formatBytes(result?.compressedSize || 0)}</span>
                {result?.width && <span style={{ color: '#D9D9D9' }}>{result.width}×{result.height}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(76,175,80,0.15)', color: '#1F3D2B' }}>✓</span>
              </div>
            )}
            {status === 'error' && (
              <span className="text-xs truncate block" style={{ color: '#dc2626' }}>{error || 'Compression failed'}</span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-0.5 flex-shrink-0">

          {/* Savings badge */}
          {showSavings && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg mr-1"
              style={{ background: 'rgba(31,61,43,0.1)', color: '#1F3D2B' }}>
              -{savings}%
            </span>
          )}

          {/* Info toggle */}
          {(info || result) && (
            <Btn active={showInfo} title="Image info" onClick={() => setShowInfo(v => !v)}>
              <InfoIcon />
            </Btn>
          )}

          {/* Copy */}
          {status === 'done' && (
            <Btn title={copied ? 'Copied!' : 'Copy to clipboard'} onClick={handleCopy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Btn>
          )}

          {/* Download */}
          {status === 'done' && result?.url && (
            <Btn accent title="Download" onClick={() => onDownload?.(id)}>
              <DownloadIcon />
            </Btn>
          )}

          {/* Retry */}
          {status === 'error' && (
            <Btn title="Retry" onClick={() => onRetry?.(id)}>
              <RetryIcon />
            </Btn>
          )}

          {/* Remove */}
          <Btn danger title="Remove" onClick={() => onRemove?.(id)}>
            <XIcon />
          </Btn>
        </div>
      </div>

      {/* ── Info panel ── */}
      {showInfo && (
        <div className="border-t px-4 py-3"
          style={{ borderColor: '#F0EDE6', background: 'rgba(245,241,232,0.45)' }}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            {info && <>
              <IRow label="Original"    value={`${info.width} × ${info.height}px`} />
              <IRow label="Format"      value={info.format?.replace('image/', '').toUpperCase() ?? '—'} />
              <IRow label="File size"   value={formatBytes(info.size)} />
              <IRow label="Transparency" value={info.hasAlpha ? 'Yes' : 'No'} />
            </>}
            {result && <>
              <IRow label="Output"      value={`${result.width} × ${result.height}px`} />
              <IRow label="Out format"  value={result.outputMime?.replace('image/', '').toUpperCase() ?? '—'} />
              <IRow label="Out size"    value={formatBytes(result.compressedSize)} />
              <IRow label="Space saved" value={showSavings ? `${savings}%` : '—'} accent={showSavings} />
            </>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IRow({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[10px]" style={{ color: '#6B4F3A' }}>{label}</span>
      <span className="text-[10px] font-semibold" style={{ color: accent ? '#1F3D2B' : '#2A2A2A' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function Btn({ children, onClick, title, active, accent, danger }) {
  const base = active ? '#1F3D2B' : accent ? '#1F3D2B' : '#C4C0B8'
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-lg transition-all duration-100"
      style={{ color: base, background: active ? 'rgba(31,61,43,0.08)' : 'transparent' }}
      onMouseEnter={e => {
        e.currentTarget.style.color = danger ? '#dc2626' : '#1F3D2B'
        e.currentTarget.style.background = danger ? 'rgba(220,38,38,0.07)' : 'rgba(31,61,43,0.07)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = base
        e.currentTarget.style.background = active ? 'rgba(31,61,43,0.08)' : 'transparent'
      }}>
      {children}
    </button>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 15C9 15 3 11 3 6.5C3 4 5.7 2 9 2c3.3 0 6 2 6 4.5C15 11 9 15 9 15Z"
      fill="#4CAF50" fillOpacity="0.25" stroke="#4CAF50" strokeWidth="1.2" />
    <path d="M9 15V7" stroke="#6B4F3A" strokeWidth="1" strokeLinecap="round" />
  </svg>
)
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 2v8M4.5 7.5l3 3 3-3" /><path d="M2 12h11" />
  </svg>
)
const RetryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 7a5 5 0 1 0 1-3" /><path d="M2 2v3h3" strokeLinejoin="round" />
  </svg>
)
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M2 2l9 9M11 2l-9 9" />
  </svg>
)
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="7.5" cy="7.5" r="6" /><path d="M7.5 7v4M7.5 5h.01" />
  </svg>
)
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="4.5" width="7.5" height="7.5" rx="1.5" />
    <path d="M2 9.5V2.5a1 1 0 0 1 1-1h7" />
  </svg>
)
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#4CAF50" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 7.5L5.5 10.5L11.5 4" />
  </svg>
)
