import { formatBytes, savingsPercent } from '../hooks/formatBytes'

export default function ResultsBar({ totalOriginal, totalCompressed, allSettled, multiFile, onDownloadAll, onDownloadZip, onClearAll }) {
  if (!totalCompressed) return null

  const savings  = savingsPercent(totalOriginal, totalCompressed)
  const isLarger = totalCompressed >= totalOriginal

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${isLarger ? 'rgba(107,79,58,0.2)' : 'rgba(76,175,80,0.25)'}` }}>
      {/* Top results strip */}
      <div className="px-5 py-4" style={{ background: isLarger ? 'rgba(107,79,58,0.06)' : 'linear-gradient(135deg, rgba(31,61,43,0.07) 0%, rgba(76,175,80,0.06) 100%)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-5">
            <StatBlock label="Before" value={formatBytes(totalOriginal)} muted />
            <ArrowIcon />
            <StatBlock label="After" value={formatBytes(totalCompressed)} />
            <div className="ml-2 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isLarger ? '#6B4F3A' : '#4CAF50' }}>
                {isLarger ? 'Larger' : 'Saved'}
              </span>
              <span className="text-2xl font-bold leading-tight" style={{ color: isLarger ? '#6B4F3A' : '#1F3D2B', letterSpacing: '-1px' }}>
                {isLarger ? `+${Math.abs(savings)}%` : `${savings}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClearAll}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ color: '#6B4F3A', border: '1px solid #D9D9D9', background: 'transparent' }}>
              Clear
            </button>
            {allSettled && !isLarger && (
              multiFile ? (
                <>
                  <button onClick={onDownloadAll}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ color: '#1F3D2B', border: '1.5px solid #1F3D2B', background: 'transparent' }}>
                    All files
                  </button>
                  <button onClick={onDownloadZip}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                    style={{ background: '#1F3D2B', color: '#F5F1E8', border: 'none' }}>
                    Download ZIP
                  </button>
                </>
              ) : (
                <button onClick={onDownloadAll}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{ background: '#1F3D2B', color: '#F5F1E8', border: 'none' }}>
                  Download
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Quality preserved badge */}
      {!isLarger && savings >= 20 && (
        <div className="px-5 py-2.5 flex items-center gap-2"
          style={{ background: 'rgba(31,61,43,0.04)', borderTop: '1px solid rgba(76,175,80,0.12)' }}>
          <LeafBadge />
          <span className="text-[11px] font-medium" style={{ color: '#1F3D2B' }}>Quality preserved</span>
          <span className="text-[11px]" style={{ color: '#6B4F3A' }}>· Compressed with Bonsai</span>
        </div>
      )}
    </div>
  )
}

function StatBlock({ label, value, muted }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#6B4F3A' }}>{label}</p>
      <p className="text-lg font-semibold leading-tight" style={{ color: muted ? '#6B4F3A' : '#1F3D2B' }}>{value}</p>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#D9D9D9' }}>
      <path d="M2 8h10M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LeafBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 12 C7 12 2 9 2 5.5 C2 3.5 4.2 2 7 2 C9.8 2 12 3.5 12 5.5 C12 9 7 12 7 12Z"
        fill="#4CAF50" fillOpacity="0.3" stroke="#4CAF50" strokeWidth="1" />
    </svg>
  )
}
