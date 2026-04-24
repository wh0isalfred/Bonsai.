/**
 * src/features/history/BatchCard.jsx
 *
 * Shows one compression session in history.
 * Active batches show a "Download ZIP" button.
 * Expired batches are grayed out — no download available.
 */
import { useState } from 'react'
import { formatBytes } from '../../utils/formatBytes'
import { useHistoryStore } from '../../store/userHistoryStore'

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
    if (ms <= 0) return null
    const d = Math.floor(ms / 86_400_000)
    const h = Math.floor((ms % 86_400_000) / 3_600_000)
    const m = Math.floor((ms % 3_600_000)  / 60_000)
    if (d > 0)  return `${d}d ${h}h`
    if (h > 0)  return `${h}h ${m}m`
    return `${m}m`
  } catch { return null }
}

export default function BatchCard({ batch, onDelete, expired = false }) {
  const { downloadBatch } = useHistoryStore()
  const [downloading, setDownloading] = useState(false)

  const {
    id, timestamp, expiresAt, isPro, fileCount,
    totalOriginal, totalCompressed, savings,
    files = [], state, hasBlobs,
  } = batch

  const isSoon     = state === 'expiring_soon'
  const canDownload= !expired && state !== 'expired' && hasBlobs !== false

  const handleDownload = async (e) => {
    e.stopPropagation()
    if (downloading || !canDownload) return
    setDownloading(true)
    try {
      await downloadBatch(id)
    } finally {
      setDownloading(false)
    }
  }

  const remaining = expiresAt ? timeRemaining(expiresAt) : null

  return (
    <div style={{
      borderRadius: 'var(--r-md)',
      border:       `1px solid ${
        expired   ? 'var(--border)'
        : isSoon  ? 'rgba(245,166,35,.25)'
        : 'var(--border)'
      }`,
      background:   expired ? 'var(--surface-2)' : 'var(--surface)',
      overflow:     'hidden',
      opacity:      expired ? 0.55 : 1,
      boxShadow:    expired ? 'none' : 'var(--shadow-xs)',
      transition:   'opacity var(--t-base)',
    }}>

      {/* Main row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px' }}>

        {/* Thumbnail stack */}
        <div style={{ display:'flex', flexShrink:0 }}>
          {files.slice(0, 3).map((f, i) => (
            <div key={i} style={{
              width:34, height:34, borderRadius:'var(--r-sm)',
              overflow:'hidden', border:'2px solid var(--surface-2)',
              background:'var(--c-bg)', marginLeft: i > 0 ? -8 : 0,
              zIndex: 3 - i, flexShrink:0,
            }}>
              {f.thumbnail
                ? <img src={f.thumbnail} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <MiniLeaf />}
            </div>
          ))}
          {fileCount > 3 && (
            <div style={{
              width:34, height:34, borderRadius:'var(--r-sm)',
              border:'2px solid var(--surface-2)', background:'var(--surface-3)',
              marginLeft:-8, zIndex:0, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'.6rem', fontWeight:700, color:'var(--t-secondary)',
            }}>
              +{fileCount - 3}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Title row */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2 }}>
            <span style={{
              fontSize:'.82rem', fontWeight:600,
              color: expired ? 'var(--t-tertiary)' : 'var(--t-primary)',
            }}>
              {fileCount} image{fileCount !== 1 ? 's' : ''}
            </span>
            {isPro && <Pill label="Pro" color="var(--c)" bg="var(--c-bg)" />}
            {isSoon && !expired && (
              <Pill label="Expiring soon" color="var(--warning)" bg="rgba(245,166,35,.1)" />
            )}
          </div>

          {/* Sizes */}
          <div style={{ display:'flex', alignItems:'center', gap:5,
                        fontSize:'.72rem', flexWrap:'wrap', marginBottom:3 }}>
            <span style={{ color:'var(--t-secondary)' }}>{formatBytes(totalOriginal)}</span>
            <span style={{ color:'var(--t-tertiary)' }}>→</span>
            <span style={{ fontWeight:600, color: expired ? 'var(--t-tertiary)' : 'var(--c)' }}>
              {formatBytes(totalCompressed)}
            </span>
            {savings > 0 && !expired && (
              <span style={{
                fontSize:'.62rem', fontWeight:700, padding:'1px 6px',
                borderRadius:99, background:'var(--c-bg-2)', color:'var(--c)',
              }}>
                −{savings}%
              </span>
            )}
          </div>

          {/* Timestamp + expiry */}
          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:'.67rem', color:'var(--t-tertiary)' }}>
              {relativeTime(timestamp)}
            </span>
            {expired ? (
              <span style={{ fontSize:'.67rem', color:'var(--t-tertiary)' }}>· Expired</span>
            ) : remaining ? (
              <span style={{
                fontSize:'.67rem',
                color: isSoon ? 'var(--warning)' : 'var(--t-tertiary)',
              }}>
                · Expires in {remaining}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>

          {/* Download ZIP */}
          {canDownload && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download ZIP"
              style={{
                display:     'flex', alignItems:'center', gap:5,
                padding:     '5px 10px', borderRadius:'var(--r-sm)',
                border:      '1px solid var(--c-border)',
                background:  'var(--c-bg)',
                color:       'var(--c)',
                fontFamily:  'var(--font-ui)',
                fontSize:    '.72rem', fontWeight:600,
                cursor:      downloading ? 'wait' : 'pointer',
                opacity:     downloading ? .6 : 1,
                transition:  'all var(--t-fast)',
                whiteSpace:  'nowrap',
              }}
              onMouseEnter={e => { if (!downloading) e.currentTarget.style.background = 'var(--c-bg-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-bg)' }}>
              {downloading ? (
                <span className="spin" style={{
                  display:'inline-block', width:10, height:10,
                  borderRadius:'50%', border:'1.5px solid var(--c-border)',
                  borderTopColor:'var(--c)',
                }}/>
              ) : <DownloadIcon />}
              {downloading ? 'Zipping…' : 'Download ZIP'}
            </button>
          )}

          {/* Expired — no download */}
          {expired && (
            <span style={{
              fontSize:'.66rem', color:'var(--t-tertiary)',
              fontStyle:'italic', flexShrink:0,
            }}>
              No longer available
            </span>
          )}

          {/* Delete */}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            title="Remove"
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--t-tertiary)', padding:4, flexShrink:0,
              borderRadius:4, transition:'color var(--t-fast)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t-tertiary)'}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
                 stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Pill({ label, color, bg }) {
  return (
    <span style={{
      fontSize:'.58rem', fontWeight:700, letterSpacing:'.05em',
      textTransform:'uppercase', padding:'2px 6px', borderRadius:99,
      background:bg, color,
    }}>
      {label}
    </span>
  )
}
function MiniLeaf() {
  return (
    <div style={{ width:'100%', height:'100%', display:'flex',
                  alignItems:'center', justifyContent:'center' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 12C7 12 2.5 9 2.5 5.5C2.5 3.6 4.5 2 7 2s4.5 1.6 4.5 3.5C11.5 9 7 12 7 12Z"
          fill="#4BB872" fillOpacity=".25" stroke="#4BB872" strokeWidth="1"/>
      </svg>
    </div>
  )
}
const DownloadIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 1v7M2.5 6l3 3 3-3"/><path d="M1 10h9"/>
  </svg>
)
