// src/features/history/HistoryPanel.jsx
import BatchCard from './BatchCard'
import { useHistoryStore } from '../../store/userHistoryStore'

export default function HistoryPanel() {
  const { batches, clearHistory, deleteBatch } = useHistoryStore()

  const active  = batches.filter(b => b.state !== 'expired')
  const expired = batches.filter(b => b.state === 'expired')
  const hasFree = batches.some(b => !b.isPro && b.state !== 'expired')

  if (!batches.length) {
    return (
      <div style={{
        display:        'flex', flexDirection: 'column',
        alignItems:     'center', justifyContent: 'center',
        gap:            12, padding: '3.5rem 2rem',
        background:     'var(--c-cream)', border: '1px solid var(--c-clay)',
        borderRadius:   'var(--r-xl)', textAlign: 'center',
      }}>
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <circle cx="19" cy="19" r="17" stroke="var(--c-clay)" strokeWidth="1.5"/>
          <path d="M19 11v8l5 3" stroke="var(--c-clay)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <p style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--c-text)', margin: '0 0 4px' }}>
            No compression history
          </p>
          <p style={{ fontSize: '.76rem', color: 'var(--c-text-2)', margin: 0 }}>
            Compressed batches appear here for 72 hours.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '.63rem', fontWeight: 700, letterSpacing: '.1em',
                    textTransform: 'uppercase', color: 'var(--c-canopy)', margin: 0 }}>
          {batches.length} session{batches.length !== 1 ? 's' : ''}
        </p>
        <button onClick={clearHistory} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '.72rem', color: 'var(--c-stone)',
          fontFamily: 'var(--font-ui)', transition: 'color var(--t-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--c-error)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--c-stone)'}>
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
          <Divider label="Expired" />
          {expired.map(b => (
            <BatchCard key={b.id} batch={b} onDelete={() => deleteBatch(b.id)} expired />
          ))}
        </>
      )}

      {/* Pro upsell if any free batches exist */}
      {hasFree && (
        <div style={{
          display:      'flex', alignItems: 'flex-start', gap: 10,
          padding:      '11px 13px', borderRadius: 'var(--r-md)',
          background:   'rgba(25,56,38,.04)',
          border:       '1px solid rgba(25,56,38,.1)',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="7" cy="7" r="6" fill="#4BB872" fillOpacity=".18" stroke="var(--c-forest)" strokeWidth="1.2"/>
            <path d="M7 6.5v3M7 5h.01" stroke="var(--c-forest)" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          <div>
            <p style={{ fontSize: '.76rem', fontWeight: 600, color: 'var(--c-forest)', margin: '0 0 2px' }}>
              Free batches expire after 72 hours
            </p>
            <p style={{ fontSize: '.72rem', color: 'var(--c-text-2)', margin: 0 }}>
              Upgrade to Pro for permanent history and re-download.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--c-clay)' }} />
      <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em',
                     textTransform: 'uppercase', color: 'var(--c-stone)' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--c-clay)' }} />
    </div>
  )
}
