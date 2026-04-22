// src/features/history/BatchCard.jsx
import { formatBytes } from '../../utils/formatBytes'

function relativeTime(iso) {
  try {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60)    return 'just now'
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  } catch { return '' }
}

function timeRemaining(iso) {
  try {
    const ms = new Date(iso).getTime() - Date.now()
    if (ms <= 0) return 'expired'
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  } catch { return '' }
}

export default function BatchCard({ batch, onDelete, expired = false }) {
  const { timestamp, expiresAt, isPro, fileCount,
          totalOriginal, totalCompressed, savings, files = [], state } = batch

  const isSoon = state === 'expiring_soon'

  return (
    <div style={{
      borderRadius: 'var(--r-md)',
      border:       `1px solid ${isSoon ? 'rgba(190,120,36,.3)' : 'var(--c-clay)'}`,
      background:   expired ? 'var(--c-sand)' : 'var(--c-cream)',
      overflow:     'hidden',
      opacity:      expired ? 0.58 : 1,
      boxShadow:    expired ? 'none' : 'var(--shadow-xs)',
      transition:   'opacity var(--t-base)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>

        {/* Thumbnail stack */}
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {files.slice(0, 3).map((f, i) => (
            <div key={i} style={{
              width:        34, height: 34,
              borderRadius: 'var(--r-sm)',
              overflow:     'hidden',
              border:       '2px solid var(--c-cream)',
              background:   'var(--c-fog)',
              marginLeft:   i > 0 ? -8 : 0,
              zIndex:       3 - i,
              flexShrink:   0,
            }}>
              {f.thumbnail
                ? <img src={f.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <MiniLeaf />}
            </div>
          ))}
          {fileCount > 3 && (
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--r-sm)',
              border: '2px solid var(--c-cream)', background: 'var(--c-sand)',
              marginLeft: -8, zIndex: 0, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.6rem', fontWeight: 700, color: 'var(--c-text-2)',
            }}>
              +{fileCount - 3}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.82rem', fontWeight: 600,
                           color: expired ? 'var(--c-text-2)' : 'var(--c-text)' }}>
              {fileCount} image{fileCount !== 1 ? 's' : ''}
            </span>
            {isPro && (
              <Pill label="Pro" bg="rgba(25,56,38,.12)" color="var(--c-forest)" />
            )}
            {isSoon && !expired && (
              <Pill label="Expiring soon" bg="rgba(190,120,36,.12)" color="var(--c-warning)" />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
                        fontSize: '.72rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--c-text-2)' }}>{formatBytes(totalOriginal)}</span>
            <span style={{ color: 'var(--c-stone)' }}>→</span>
            <span style={{ fontWeight: 600, color: expired ? 'var(--c-text-2)' : 'var(--c-canopy)' }}>
              {formatBytes(totalCompressed)}
            </span>
            {savings > 0 && !expired && (
              <span style={{
                fontSize: '.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                background: 'rgba(25,56,38,.09)', color: 'var(--c-forest)',
              }}>
                -{savings}%
              </span>
            )}
          </div>

          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '.67rem', color: 'var(--c-stone)' }}>
              {relativeTime(timestamp)}
            </span>
            {expiresAt && !expired && (
              <span style={{ fontSize: '.67rem',
                             color: isSoon ? 'var(--c-warning)' : 'var(--c-text-3)' }}>
                · Expires in {timeRemaining(expiresAt)}
              </span>
            )}
            {expired && (
              <span style={{ fontSize: '.67rem', color: 'var(--c-stone)' }}>· Expired</span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button onClick={onDelete} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--c-stone)', padding: 4, flexShrink: 0,
          transition: 'color var(--t-fast)', borderRadius: 4,
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--c-error)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--c-stone)'}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
               stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M1 1l10 10M11 1L1 11"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function Pill({ label, bg, color }) {
  return (
    <span style={{
      fontSize: '.58rem', fontWeight: 700, letterSpacing: '.05em',
      textTransform: 'uppercase', padding: '2px 6px', borderRadius: 99,
      background: bg, color,
    }}>
      {label}
    </span>
  )
}

function MiniLeaf() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 12C7 12 2.5 9 2.5 5.5C2.5 3.6 4.5 2 7 2s4.5 1.6 4.5 3.5C11.5 9 7 12 7 12Z"
          fill="#4BB872" fillOpacity=".25" stroke="#4BB872" strokeWidth="1"/>
      </svg>
    </div>
  )
}
