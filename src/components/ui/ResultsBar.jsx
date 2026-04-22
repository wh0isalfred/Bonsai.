import { useState, useEffect, useRef } from 'react'
import { formatBytes, savingsPercent } from '../../utils/formatBytes'

// Animates a number from 0 to target over ~800ms
function useCountUp(target, active) {
  const [current, setCurrent] = useState(0)
  const rafRef  = useRef(null)
  const startTs = useRef(null)

  useEffect(() => {
    if (!active || target === 0) { setCurrent(target); return }
    startTs.current = null
    const DURATION = 900

    const step = (ts) => {
      if (!startTs.current) startTs.current = ts
      const elapsed = ts - startTs.current
      const progress = Math.min(elapsed / DURATION, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, active])

  return current
}

export default function ResultsBar({
  totalOriginal, totalCompressed, allSettled, multiFile,
  onDownloadAll, onDownloadZip, onClearAll,
  locked = false, onUnlock,
}) {
  if (!totalCompressed) return null

  const savings      = savingsPercent(totalOriginal, totalCompressed)
  const isLarger     = totalCompressed >= totalOriginal
  const [fired, setFired] = useState(false)
  const animSavings  = useCountUp(savings, fired)

  // Fire animation once when this first renders with data
  useEffect(() => { setFired(true) }, [])

  const accent = isLarger ? '#6B4F3A' : '#1F3D2B'
  const accentBg = isLarger ? 'rgba(107,79,58,0.06)' : 'rgba(31,61,43,0.05)'
  const accentBorder = isLarger ? 'rgba(107,79,58,0.2)' : 'rgba(76,175,80,0.25)'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${accentBorder}` }}>

      {/* ── Main stats row ── */}
      <div className="px-5 py-4" style={{ background: accentBg }}>
        <div className="flex items-center gap-4 flex-wrap">

          {/* Big savings number */}
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: isLarger ? '#6B4F3A' : '#4CAF50' }}>
              {isLarger ? 'Increased' : 'Saved'}
            </span>
            <span className="text-4xl font-black tabular-nums"
              style={{ color: accent, letterSpacing: '-2px', lineHeight: 1 }}>
              {animSavings}
              <span className="text-2xl" style={{ letterSpacing: '-1px' }}>%</span>
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-10 self-center" style={{ background: accentBorder }} />

          {/* Before / After */}
          <div className="flex gap-5 flex-1 flex-wrap">
            <StatBlock label="Before" value={formatBytes(totalOriginal)} muted />
            <div className="flex items-center self-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#D9D9D9' }}>
                <path d="M2 8h10M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <StatBlock label="After" value={formatBytes(totalCompressed)} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onClearAll}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ color: '#6B4F3A', border: '1px solid #D9D9D9', background: 'transparent' }}>
              Clear
            </button>
            {allSettled && !isLarger && !locked && (
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
            {/* Locked export — Pro Mode, free user */}
            {locked && allSettled && !isLarger && (
              <button onClick={onUnlock}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                style={{ background: '#1F3D2B', color: '#F5F1E8', border: 'none' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="2" y="5.5" width="8" height="5.5" rx="1.5" />
                  <path d="M4 5.5V4a2 2 0 1 1 4 0v1.5" />
                </svg>
                Unlock export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Shrinking bar ── */}
      {!isLarger && (
        <div style={{ background: accentBg, borderTop: `1px solid ${accentBorder}` }}>
          <div className="px-5 py-2.5 flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px]" style={{ color: '#6B4F3A' }}>
              <span>{formatBytes(totalOriginal)} original</span>
              <span>{formatBytes(totalCompressed)} compressed</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(31,61,43,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, 100 - savings)}%`,
                  background: 'linear-gradient(90deg, #1F3D2B, #4CAF50)',
                  transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
                }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Quality badge ── */}
      {!isLarger && savings >= 20 && (
        <div className="px-5 py-2.5 flex items-center gap-2"
          style={{ background: 'rgba(31,61,43,0.03)', borderTop: `1px solid ${accentBorder}` }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 12 C7 12 2 9 2 5.5 C2 3.5 4.2 2 7 2 C9.8 2 12 3.5 12 5.5 C12 9 7 12 7 12Z"
              fill="#4CAF50" fillOpacity="0.3" stroke="#4CAF50" strokeWidth="1.1" />
          </svg>
          <span className="text-[11px] font-semibold" style={{ color: '#1F3D2B' }}>Quality preserved</span>
          <span className="text-[11px]" style={{ color: '#6B4F3A' }}>· Compressed with Bonsai</span>
        </div>
      )}
    </div>
  )
}

function StatBlock({ label, value, muted }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B4F3A' }}>{label}</p>
      <p className="text-lg font-bold leading-tight mt-0.5" style={{ color: muted ? '#6B4F3A' : '#1F3D2B' }}>{value}</p>
    </div>
  )
}
