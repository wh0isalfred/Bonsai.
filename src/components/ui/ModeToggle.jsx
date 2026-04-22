/**
 * src/components/ui/ModeToggle.jsx
 *
 * Smart / Pro pill toggle with:
 *   - Spring-physics pill slide (cubic-bezier(.34,1.56,.64,1))
 *   - Scale bounce on click
 *   - Celadon glow on Pro active state
 *   - Sub-label fade
 *   - Ripple on tap
 */
import { useCallback, useRef } from 'react'
import { useModeStore } from '../../store/useModeStore'

const TABS = [
  { id: 'smart', label: 'Smart', sub: '1-click' },
  { id: 'pro',   label: 'Pro',   sub: 'Full control' },
]

export default function ModeToggle({ onModeChange }) {
  const mode    = useModeStore(s => s.mode)
  const setMode = useModeStore(s => s.setMode)
  const trackRef = useRef(null)

  const handleClick = useCallback((id, e) => {
    if (id === mode) return

    // Ripple from click position
    addRipple(e)

    setMode(id)
    onModeChange?.(id)
  }, [mode, setMode, onModeChange])

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="Compression mode"
      style={{
        display:       'flex',
        alignItems:    'center',
        background:    'var(--ink-3)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--r-full)',
        padding:       3,
        gap:           2,
        position:      'relative',
        userSelect:    'none',
        /* Celadon glow when Pro active */
        boxShadow:     mode === 'pro'
          ? '0 0 0 1px var(--c-border), 0 0 16px rgba(125,235,160,.12)'
          : 'none',
        transition:    'box-shadow .4s ease',
        minWidth:      190,
      }}>

      {/* ── Sliding pill ─────────────────────────────────────────── */}
      <span
        aria-hidden="true"
        style={{
          position:      'absolute',
          top:           3,
          bottom:        3,
          left:          mode === 'pro' ? 'calc(50% + 1px)' : 3,
          width:         'calc(50% - 4px)',
          borderRadius:  'var(--r-full)',
          background:    mode === 'pro'
            ? 'var(--c)'
            : 'var(--surface-2)',
          boxShadow:     mode === 'pro'
            ? '0 2px 12px rgba(125,235,160,.3)'
            : 'var(--shadow-xs)',
          /* Spring easing — overshoots slightly for life */
          transition: [
            'left .36s cubic-bezier(.34,1.56,.64,1)',
            'background .2s ease',
            'box-shadow .2s ease',
          ].join(', '),
          pointerEvents: 'none',
          zIndex:        0,
        }} />

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      {TABS.map(tab => {
        const active = mode === tab.id
        const isPro  = tab.id === 'pro'

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={e => handleClick(tab.id, e)}
            style={{
              flex:            1,
              position:        'relative',
              zIndex:          1,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             5,
              padding:         '.44rem .6rem',
              border:          'none',
              background:      'transparent',
              borderRadius:    'var(--r-full)',
              cursor:          active ? 'default' : 'pointer',
              fontFamily:      'var(--font-ui)',
              overflow:        'hidden',  /* for ripple */
              WebkitTapHighlightColor: 'transparent',
              /* Spring scale on activation */
              transform:       active ? 'scale(1)' : 'scale(1)',
              transition:      'color .2s ease, transform .15s ease',
              color: active
                ? (isPro ? 'var(--ink)' : 'var(--t-primary)')
                : 'var(--t-tertiary)',
            }}>

            {/* Label */}
            <span style={{
              fontSize:   '.78rem',
              fontWeight: 700,
              lineHeight: 1,
              transition: 'letter-spacing .2s ease',
              letterSpacing: active ? '.01em' : '0',
            }}>
              {tab.label}
            </span>

            {/* Sub-label — fades in when active */}
            <span style={{
              fontSize:   '.6rem',
              lineHeight: 1,
              opacity:    active ? .65 : 0,
              maxWidth:   active ? 60 : 0,
              overflow:   'hidden',
              transition: 'opacity .25s ease, max-width .25s ease',
              whiteSpace: 'nowrap',
            }}>
              {tab.sub}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* Add a ripple span at click position */
function addRipple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.4
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top  - size / 2

  const ripple = document.createElement('span')
  ripple.className = 'ripple'
  ripple.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x}px; top:${y}px;
    opacity:.18;
  `
  btn.appendChild(ripple)
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
}
