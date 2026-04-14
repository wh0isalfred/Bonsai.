import { useState } from 'react'
import { formatBytes, savingsPercent } from '../hooks/formatBytes'
import { PRESETS } from '../config/presets'

export default function FileCard(props) {
  const {
    file,
    onRemove,
    onRetry,
    onDownload,
    onCopy,
    onRename,
    onPresetOverride
  } = props || {}

  const {
    id,
    name = '',
    size = 0,
    status = 'idle',
    progress = 0,
    result,
    error,
    info,
    outputName,
    presetOverride
  } = file || {}

  const baseName = name?.replace?.(/\.[^/.]+$/, '') ?? ''

  const savings = result?.compressedSize
    ? savingsPercent(size, result.compressedSize)
    : null

  const showSavings = typeof savings === 'number' && savings > 0

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(outputName ?? baseName)
  const [showInfo, setShowInfo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  const commitRename = () => {
    setEditingName(false)
    onRename?.(id, nameInput)
  }

  const handleCopy = async () => {
    try {
      const ok = await onCopy?.(id)
      if (ok) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
        // ignore copy errors
    }
  }

  const safeProgress = Math.max(0, Math.min(100, progress ?? 0))

  const displayName = outputName ?? name ?? 'Untitled'

  return (
    <div
      className="rounded-2xl overflow-hidden group transition-all duration-200"
      style={{ background: '#fff', border: '1px solid #E8E4DC' }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Thumbnail */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            background: 'rgba(76,175,80,0.08)',
            border: '1px solid rgba(76,175,80,0.15)'
          }}
        >
          {result?.url ? (
            <img
              src={result.url}
              alt=""
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <LeafIcon />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameInput ?? ''}
              onChange={e => setNameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setEditingName(false)
              }}
              className="w-full text-sm px-2 py-0.5 rounded-lg border outline-none"
              style={{
                borderColor: '#4CAF50',
                color: '#2A2A2A',
                fontFamily: 'inherit'
              }}
            />
          ) : (
            <p
              className="text-sm font-medium truncate leading-tight cursor-text transition-colors"
              style={{ color: '#2A2A2A' }}
              onClick={() => {
                setEditingName(true)
                setNameInput(outputName ?? baseName)
              }}
              title="Click to rename"
            >
              {displayName}
            </p>
          )}

          <div className="mt-0.5">
            {status === 'compressing' && (
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: '#E8E4DC' }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-200"
                    style={{
                      width: `${safeProgress}%`,
                      background:
                        'linear-gradient(90deg, #1F3D2B, #4CAF50)'
                    }}
                  />
                </div>
                <span
                  className="text-[10px] tabular-nums font-medium"
                  style={{ color: '#1F3D2B' }}
                >
                  {safeProgress}%
                </span>
              </div>
            )}

            {status === 'idle' && (
              <span className="text-xs" style={{ color: '#6B4F3A' }}>
                {formatBytes(size ?? 0)} · ready
              </span>
            )}

            {status === 'done' && (
              <span className="text-xs" style={{ color: '#6B4F3A' }}>
                {formatBytes(size ?? 0)}
                <span
                  className="mx-1.5"
                  style={{ color: '#D9D9D9' }}
                >
                  →
                </span>
                <span
                  className="font-semibold"
                  style={{ color: '#1F3D2B' }}
                >
                  {formatBytes(result?.compressedSize ?? 0)}
                </span>

                {result?.width && (
                  <span
                    className="ml-1.5"
                    style={{ color: '#D9D9D9' }}
                  >
                    {result.width}×{result?.height ?? ''}
                  </span>
                )}
              </span>
            )}

            {status === 'error' && (
              <span
                className="text-xs truncate block max-w-[220px]"
                style={{ color: '#c0392b' }}
                title={error ?? ''}
              >
                {error ?? 'Something went wrong'}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {showSavings && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
              style={{
                background: 'rgba(31,61,43,0.1)',
                color: '#1F3D2B'
              }}
            >
              -{savings}%
            </span>
          )}

          {/* Presets */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(v => !v)}
              className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              style={{
                color: presetOverride ? '#1F3D2B' : '#D9D9D9'
              }}
              title="Override preset"
            >
              <TuneIcon />
            </button>

            {showPresets && (
              <div
                className="absolute right-0 top-8 z-30 rounded-xl py-1 min-w-[150px]"
                style={{
                  background: '#fff',
                  border: '1px solid #E8E4DC',
                  boxShadow:
                    '0 8px 24px rgba(31,61,43,0.12)'
                }}
              >
                <button
                  onClick={() => {
                    onPresetOverride?.(id, null)
                    setShowPresets(false)
                  }}
                  className="w-full text-left px-3 py-2 text-xs"
                >
                  Use global setting
                </button>

                {(PRESETS ?? []).map(p => (
                  <button
                    key={p?.id}
                    onClick={() => {
                      onPresetOverride?.(id, p?.id)
                      setShowPresets(false)
                    }}
                    className="w-full text-left px-3 py-2 text-xs"
                  >
                    {p?.label ?? 'Preset'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(info || result) && (
            <button
              onClick={() => setShowInfo(v => !v)}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
            >
              <InfoIcon />
            </button>
          )}

          {status === 'done' && (
            <button onClick={handleCopy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}

          {status === 'done' && result?.url && (
            <button onClick={() => onDownload?.(id)}>
              <DownloadIcon />
            </button>
          )}

          {status === 'error' && (
            <button onClick={() => onRetry?.(id)}>
              <RetryIcon />
            </button>
          )}

          <button onClick={() => onRemove?.(id)}>
            <XIcon />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 px-4 py-3 border-t">
          {info && (
            <>
              <InfoRow
                label="Original"
                value={`${info?.width ?? '—'} × ${
                  info?.height ?? '—'
                }px`}
              />
              <InfoRow
                label="Format"
                value={
                  info?.format
                    ?.replace?.('image/', '')
                    ?.toUpperCase?.() ?? '—'
                }
              />
              <InfoRow
                label="Size"
                value={formatBytes(info?.size ?? 0)}
              />
              <InfoRow
                label="Alpha"
                value={info?.hasAlpha ? 'Yes' : 'No'}
              />
            </>
          )}

          {result && (
            <>
              <InfoRow
                label="Output"
                value={`${result?.width ?? '—'} × ${
                  result?.height ?? '—'
                }px`}
              />
              <InfoRow
                label="Format"
                value={
                  result?.outputMime
                    ?.replace?.('image/', '')
                    ?.toUpperCase?.() ?? '—'
                }
              />
              <InfoRow
                label="Size"
                value={formatBytes(
                  result?.compressedSize ?? 0
                )}
              />
              <InfoRow
                label="Saved"
                value={
                  savings > 0 ? `${savings}%` : '—'
                }
                accent={savings > 0}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value}) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-[10px]">{label ?? ''}</span>
      <span className="text-[10px] font-semibold">
        {value ?? '—'}
      </span>
    </div>
  )
}

/* Icons unchanged */
const LeafIcon = () => <svg />
const DownloadIcon = () => <svg />
const RetryIcon = () => <svg />
const XIcon = () => <svg />
const InfoIcon = () => <svg />
const CopyIcon = () => <svg />
const CheckIcon = () => <svg />
const TuneIcon = () => <svg />