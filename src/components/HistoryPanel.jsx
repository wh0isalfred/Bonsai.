import { formatBytes } from '../hooks/formatBytes'

export default function HistoryPanel({ entries, onClear }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center gap-3 py-16"
        style={{ background: '#fff', border: '1.5px solid #E8E4DC' }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="18" stroke="#D9D9D9" strokeWidth="1.5" />
          <path d="M20 12v8l5 3" stroke="#D9D9D9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: '#2A2A2A' }}>No history yet</p>
          <p className="text-xs mt-1" style={{ color: '#6B4F3A' }}>Compressed images will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#6B4F3A' }}>
          Recent — {entries.length} file{entries.length !== 1 ? 's' : ''}
        </p>
        <button onClick={onClear}
          className="text-[11px] transition-colors"
          style={{ color: '#D9D9D9', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.color = '#D9D9D9'}>
          Clear history
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {entries.map(entry => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function HistoryEntry({ entry }) {
  const {
    name, originalName, originalSize, compressedSize,
    savings, outputMime, date, thumbnail,
  } = entry

  const ext      = outputMime?.replace('image/', '').toUpperCase() ?? '?'
  const relDate  = relativeTime(date)

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
      style={{ background: '#fff', border: '1.5px solid #E8E4DC' }}>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.15)' }}>
        {thumbnail
          ? <img src={thumbnail} alt="" className="w-full h-full object-cover rounded-xl" />
          : <MiniLeaf />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#2A2A2A' }} title={originalName}>
          {name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs flex-wrap" style={{ color: '#6B4F3A' }}>
          <span>{formatBytes(originalSize)}</span>
          <span style={{ color: '#D9D9D9' }}>→</span>
          <span className="font-semibold" style={{ color: '#1F3D2B' }}>{formatBytes(compressedSize)}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: '#F5F1E8', color: '#6B4F3A' }}>{ext}</span>
        </div>
      </div>

      {/* Savings + time */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {savings > 0 && (
          <span className="text-[11px] font-black" style={{ color: '#1F3D2B' }}>-{savings}%</span>
        )}
        <span className="text-[10px]" style={{ color: '#D9D9D9' }}>{relDate}</span>
      </div>
    </div>
  )
}

function relativeTime(isoString) {
  try {
    const diff = Date.now() - new Date(isoString).getTime()
    const s = Math.floor(diff / 1000)
    if (s < 60)   return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  } catch { return '' }
}

const MiniLeaf = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 13C8 13 3 10 3 6C3 3.8 5.2 2 8 2s5 1.8 5 4C13 10 8 13 8 13Z"
      fill="#4CAF50" fillOpacity="0.25" stroke="#4CAF50" strokeWidth="1.1" />
  </svg>
)
