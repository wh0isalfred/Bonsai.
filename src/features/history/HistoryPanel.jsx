/**
 * src/features/history/HistoryPanel.jsx
 *
 * Expiry rules displayed:
 *   Free  → 72 hours
 *   Pro   → 2 weeks
 */
import { useEffect } from 'react'
import BatchCard from './BatchCard'
import { useHistoryStore } from '../../store/userHistoryStore'
import { useAuthStore }    from '../../store/useAuthStore'

export default function HistoryPanel() {
  const { batches, clearHistory, deleteBatch, refreshTags } = useHistoryStore()
  const plan   = useAuthStore(s => s.plan)
  const isPaid = plan === 'pro' || plan === 'supporter'

  /* Refresh expiry tags whenever panel opens or window regains focus */
  useEffect(() => {
    refreshTags()
    const onFocus = () => refreshTags()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshTags])

  const active  = batches.filter(b => b.state !== 'expired')
  const expired = batches.filter(b => b.state === 'expired')

  /* ── Empty state ─────────────────────────────────────────────────── */
  if (!batches.length) {
    return (
      <div style={{
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        gap:12, padding:'3.5rem 2rem',
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:'var(--r-xl)', textAlign:'center',
      }}>
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <circle cx="19" cy="19" r="17" stroke="var(--border-2)" strokeWidth="1.5"/>
          <path d="M19 11v8l5 3" stroke="var(--border-2)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <p style={{ fontSize:'.88rem', fontWeight:600, color:'var(--t-primary)', margin:'0 0 4px' }}>
            No compression history yet
          </p>
          <p style={{ fontSize:'.76rem', color:'var(--t-secondary)', margin:0 }}>
            Compressed batches appear here.{' '}
            {isPaid
              ? 'Your files are available for 2 weeks.'
              : 'Free files are available for 72 hours.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <p style={{ fontSize:'.63rem', fontWeight:700, letterSpacing:'.1em',
                      textTransform:'uppercase', color:'var(--c)', margin:0 }}>
            {active.length} session{active.length !== 1 ? 's' : ''}
          </p>
          {active.length > 0 && (
            <span style={{ fontSize:'.63rem', color:'var(--t-tertiary)' }}>
              · {isPaid ? '2-week' : '72-hour'} re-download window
            </span>
          )}
        </div>
        <button onClick={clearHistory} style={{
          background:'none', border:'none', cursor:'pointer',
          fontSize:'.72rem', color:'var(--t-tertiary)',
          fontFamily:'var(--font-ui)', transition:'color var(--t-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--t-tertiary)'}>
          Clear all
        </button>
      </div>

      {/* Active batches */}
      {active.map(b => (
        <BatchCard key={b.id} batch={b} onDelete={() => deleteBatch(b.id)} />
      ))}

      {/* Expired section */}
      {expired.length > 0 && (
        <>
          <Divider label="Expired — files deleted" />
          {expired.map(b => (
            <BatchCard key={b.id} batch={b} onDelete={() => deleteBatch(b.id)} expired />
          ))}
        </>
      )}

      {/* Info strip */}
      <div style={{
        display:'flex', alignItems:'flex-start', gap:10,
        padding:'10px 13px', borderRadius:'var(--r-md)',
        background:'var(--surface-2)', border:'1px solid var(--border)',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
             style={{ flexShrink:0, marginTop:1 }}>
          <circle cx="7" cy="7" r="6" stroke="var(--t-tertiary)" strokeWidth="1.2"/>
          <path d="M7 6.5v3M7 5h.01" stroke="var(--t-tertiary)" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
        <p style={{ fontSize:'.73rem', color:'var(--t-secondary)', margin:0, lineHeight:1.55 }}>
          {isPaid ? (
            <>
              <strong style={{ color:'var(--t-primary)' }}>Pro:</strong>{' '}
              files are re-downloadable for <strong style={{ color:'var(--c)' }}>2 weeks</strong>.
              After that they are permanently deleted and cannot be recovered.
            </>
          ) : (
            <>
              <strong style={{ color:'var(--t-primary)' }}>Free:</strong>{' '}
              files are re-downloadable for <strong style={{ color:'var(--c)' }}>72 hours</strong>.
              Upgrade to Pro for a{' '}
              <strong style={{ color:'var(--c)' }}>2-week</strong> window.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0' }}>
      <div style={{ flex:1, height:1, background:'var(--border)' }}/>
      <span style={{ fontSize:'.6rem', fontWeight:700, letterSpacing:'.08em',
                     textTransform:'uppercase', color:'var(--t-tertiary)' }}>
        {label}
      </span>
      <div style={{ flex:1, height:1, background:'var(--border)' }}/>
    </div>
  )
}
