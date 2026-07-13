/**
 * src/components/ui/ModeDiscovery.jsx
 *
 * Shown ONLY in the empty state, below the drop zone.
 *
 * The problem it solves: a new user sees a "Pro" tab in the mode toggle with
 * zero indication of what it does or that it costs anything — and, crucially,
 * zero indication that they can use the entire Pro editor for free right now.
 * That last part is the strongest thing this product has and it was invisible.
 *
 * So this is not an ad. It's an invitation to use a thing that is genuinely
 * free to try. The paywall lands later, at download, after they've felt it.
 *
 * It disappears the moment a file is dropped and never returns — it occupies
 * dead space and nothing else.
 */
import { useModeStore } from '../../store/useModeStore'
import { useAuthStore } from '../../store/useAuthStore'

const SMART_POINTS = [
  'Pick a preset, hit compress',
  'Batch up to 15 images at once',
  'Best for: quick, get-it-done runs',
]

const PRO_POINTS = [
  'Per-image quality, blur, sharpen, resize',
  'Live before/after preview as you tune',
  'Best for: work you hand to someone else',
]

export default function ModeDiscovery() {
  const mode    = useModeStore(s => s.mode)
  const setMode = useModeStore(s => s.setMode)

  const plan    = useAuthStore(s => s.plan)
  const isPaid  = plan === 'pro' || plan === 'supporter'

  const inSmart = mode === 'smart'

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap:                 10,
    }}>
      {/* ── Smart ─────────────────────────────────────────────────── */}
      <ModeCard
        title="Smart"
        tagline="One click. Sensible defaults."
        points={SMART_POINTS}
        active={inSmart}
        onClick={() => setMode('smart')}
        cta={inSmart ? null : 'Switch to Smart'} />

      {/* ── Pro ───────────────────────────────────────────────────── */}
      <ModeCard
        title="Pro"
        tagline="Full manual control over every image."
        points={PRO_POINTS}
        active={!inSmart}
        accent
        /* The whole point: this is free to open and free to use.
           Only the export is gated, and only after they've seen it work. */
        badge={isPaid ? null : 'Free to try'}
        onClick={() => setMode('pro')}
        cta={inSmart ? 'Open Pro editor' : null} />
    </div>
  )
}

function ModeCard({ title, tagline, points, active, accent, badge, onClick, cta }) {
  return (
    <div
      onClick={active ? undefined : onClick}
      role={active ? undefined : 'button'}
      tabIndex={active ? undefined : 0}
      onKeyDown={e => {
        if (active) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
      style={{
        padding:      '13px 14px',
        borderRadius: 'var(--r-md)',
        border:       `1px solid ${active && accent ? 'var(--c-border)' : 'var(--border)'}`,
        background:   active && accent ? 'var(--c-bg)' : 'var(--surface)',
        cursor:       active ? 'default' : 'pointer',
        transition:   'border-color var(--t-fast), background var(--t-fast)',
        outline:      'none',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.borderColor = 'var(--border-3)'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.borderColor = 'var(--border)'
      }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
        <span style={{
          fontFamily: 'var(--font-brand)',
          fontStyle:  'italic',
          fontWeight: 700,
          fontSize:   '.95rem',
          color:      accent ? 'var(--c)' : 'var(--t-primary)',
        }}>
          {title}
        </span>

        {active && (
          <span style={{
            fontSize:      '.52rem',
            fontWeight:    700,
            letterSpacing: '.07em',
            textTransform: 'uppercase',
            padding:       '2px 5px',
            borderRadius:  99,
            background:    'var(--surface-3)',
            color:         'var(--t-tertiary)',
          }}>
            Current
          </span>
        )}

        {badge && !active && (
          <span style={{
            fontSize:      '.52rem',
            fontWeight:    700,
            letterSpacing: '.07em',
            textTransform: 'uppercase',
            padding:       '2px 6px',
            borderRadius:  99,
            background:    'var(--c-bg-2)',
            color:         'var(--c)',
          }}>
            {badge}
          </span>
        )}
      </div>

      <p style={{
        fontSize: '.72rem', color: 'var(--t-tertiary)',
        margin: '0 0 9px', lineHeight: 1.45,
      }}>
        {tagline}
      </p>

      {/* Points */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0,
                   display: 'flex', flexDirection: 'column', gap: 5 }}>
        {points.map(p => (
          <li key={p} style={{
            display:    'flex',
            alignItems: 'flex-start',
            gap:        7,
            fontSize:   '.72rem',
            color:      'var(--t-secondary)',
            lineHeight: 1.45,
          }}>
            <span style={{
              color: accent ? 'var(--c)' : 'var(--t-tertiary)',
              flexShrink: 0, marginTop: 1, fontSize: '.62rem',
            }}>
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {cta && (
        <p style={{
          margin:     '11px 0 0',
          fontSize:   '.73rem',
          fontWeight: 600,
          color:      accent ? 'var(--c)' : 'var(--t-secondary)',
          display:    'flex',
          alignItems: 'center',
          gap:        5,
        }}>
          {cta}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
               stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5h6M5.5 2.5L8 5 5.5 7.5"/>
          </svg>
        </p>
      )}
    </div>
  )
}
