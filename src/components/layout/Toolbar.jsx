/**
 * src/components/layout/Toolbar.jsx
 *
 * The horizontal tool-type selector bar.
 * Reads from src/config/tools.js — adding a tool there is all that's needed.
 * "More tools" dropdown is driven by MORE_TOOLS from the same config.
 *
 * Props:
 *   activeTool  string         currently selected tool id
 *   onChange    (id) => void   called when a live tool is selected
 */
import { useState, useRef, useEffect } from 'react'
import { TOOLS, MORE_TOOLS } from '../../config/tools'

export default function Toolbar({ activeTool, onChange }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return
    const fn = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [moreOpen])

  return (
    <div style={{
      display:        'flex',
      alignItems:     'stretch',
      background:     'var(--surface)',
      borderBottom:   '1px solid var(--border)',
      overflowX:      'auto',
      scrollbarWidth: 'none',
      position:       'relative',
      WebkitOverflowScrolling: 'touch',
    }}
      className="hide-scrollbar">

      {TOOLS.map(tool => {
        const active   = activeTool === tool.id
        const disabled = tool.status !== 'live' && tool.status !== 'beta'

        return (
          <ToolTab
            key={tool.id}
            tool={tool}
            active={active}
            disabled={disabled}
            onClick={() => !disabled && onChange(tool.id)} />
        )
      })}

      {/* More tools */}
      <div ref={moreRef} style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
        <button
          onClick={() => setMoreOpen(v => !v)}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            height:     '100%',
            padding:    '0 16px',
            background: moreOpen ? 'var(--ink-3)' : 'transparent',
            border:     'none',
            borderLeft: '1px solid var(--border)',
            cursor:     'pointer',
            fontFamily: 'var(--font-ui)',
            fontSize:   '.68rem',
            fontWeight: 600,
            color:      'var(--t-tertiary)',
            transition: 'background var(--t-fast), color var(--t-fast)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => !moreOpen && (e.currentTarget.style.background = 'var(--ink-3)')}
          onMouseLeave={e => !moreOpen && (e.currentTarget.style.background = 'transparent')}
          aria-haspopup="true"
          aria-expanded={moreOpen}>
          <DotsIcon />
          More tools
          <ChevronIcon open={moreOpen} />
        </button>

        {moreOpen && (
          <div style={{
            position:      'absolute',
            top:           'calc(100% + 4px)',
            right:         0,
            minWidth:      220,
            background:    'var(--surface-2)',
            border:        '1px solid var(--border-2)',
            borderRadius:  'var(--r-lg)',
            overflow:      'hidden',
            boxShadow:     'var(--shadow-xl)',
            zIndex:        'var(--z-dropdown)',
            animation:     'dropdown-in var(--t-base) ease both',
          }}>
            <div style={{ padding: '7px 13px 6px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '.58rem', fontWeight: 700, letterSpacing: '.1em',
                          textTransform: 'uppercase', color: 'var(--t-tertiary)' }}>
                Coming soon
              </p>
            </div>

            {MORE_TOOLS.map(tool => (
              <div key={tool.id} style={{
                display:       'flex',
                alignItems:    'center',
                gap:           10,
                padding:       '9px 14px',
                borderBottom:  '1px solid var(--border)',
                opacity:       .55,
                cursor:        'not-allowed',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: 'var(--ink-3)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ToolIcon name={tool.iconName} size={13} />
                </div>
                <div>
                  <p style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--t-primary)' }}>
                    {tool.label}
                  </p>
                  <p style={{ fontSize: '.62rem', color: 'var(--t-tertiary)', marginTop: 1 }}>
                    {tool.description}
                  </p>
                </div>
                <span style={{
                  marginLeft: 'auto', fontSize: '.55rem', fontWeight: 700,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                  padding: '2px 6px', borderRadius: 99,
                  background: 'var(--surface-3)', color: 'var(--t-tertiary)',
                }}>
                  Soon
                </span>
              </div>
            ))}

            {/* Last item has no border-bottom */}
            <style>{`.more-last{border-bottom:none!important}`}</style>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Single tool tab ─────────────────────────────────────────────── */
function ToolTab({ tool, active, disabled, onClick }) {
  const [hovered, setHovered] = useState(false)
  const [tipVisible, setTipVisible] = useState(false)
  const tipTimer = useRef(null)

  const handleEnter = () => {
    setHovered(true)
    if (disabled) {
      tipTimer.current = setTimeout(() => setTipVisible(true), 400)
    }
  }
  const handleLeave = () => {
    setHovered(false)
    setTipVisible(false)
    clearTimeout(tipTimer.current)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            4,
          padding:        '10px 18px',
          height:         '100%',
          background:     active ? 'var(--c-bg)' : hovered && !disabled ? 'var(--ink-3)' : 'transparent',
          border:         'none',
          borderRight:    '1px solid var(--border)',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          opacity:        disabled ? .38 : 1,
          position:       'relative',
          transition:     'background var(--t-fast)',
          whiteSpace:     'nowrap',
        }}>

        {/* Active underline */}
        {active && (
          <span style={{
            position:   'absolute',
            bottom:     0, left: 0, right: 0,
            height:     2,
            background: 'var(--c)',
          }} />
        )}

        <ToolIcon
          name={tool.iconName}
          size={15}
          color={active ? 'var(--c)' : 'var(--t-tertiary)'} />

        <span style={{
          fontSize:   '.6rem',
          fontWeight: active ? 700 : 500,
          color:      active ? 'var(--c)' : 'var(--t-tertiary)',
        }}>
          {tool.label}
        </span>

        {tool.status === 'beta' && (
          <span style={{
            position:   'absolute',
            top:        5, right: 5,
            fontSize:   '.45rem',
            fontWeight: 800,
            padding:    '1px 4px',
            borderRadius: 3,
            background: 'var(--c-bg)',
            color:      'var(--c)',
          }}>
            β
          </span>
        )}
      </button>

      {/* "Coming soon" tooltip */}
      {tipVisible && disabled && (
        <div style={{
          position:    'absolute',
          bottom:      'calc(100% + 7px)',
          left:        '50%',
          transform:   'translateX(-50%)',
          background:  'var(--surface-3)',
          border:      '1px solid var(--border-2)',
          borderRadius:'var(--r-xs)',
          padding:     '4px 9px',
          fontSize:    '.64rem',
          color:       'var(--t-secondary)',
          whiteSpace:  'nowrap',
          pointerEvents:'none',
          boxShadow:   'var(--shadow-md)',
          zIndex:      'var(--z-dropdown)',
          animation:   'fade-down .14s ease both',
        }}>
          Coming soon
          <span style={{
            position:   'absolute',
            top:        '100%',
            left:       '50%',
            transform:  'translateX(-50%)',
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: 'var(--border-2) transparent transparent transparent',
          }} />
        </div>
      )}
    </div>
  )
}

/* ── Tool icon switcher ───────────────────────────────────────────── */
function ToolIcon({ name, size = 15, color = 'currentColor' }) {
  const s = { width: size, height: size, color }
  const p = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }

  switch (name) {
    case 'image': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="2"/>
        <circle cx="5.5" cy="5.5" r="1.5"/>
        <path d="M1.5 11l3.5-3.5 2.5 2.5 2-2 4.5 4.5"/>
      </svg>
    )
    case 'video': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <rect x="1" y="3" width="10" height="10" rx="1.5"/>
        <path d="M11 6.5l4-2v7l-4-2"/>
      </svg>
    )
    case 'audio': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <path d="M6 13V3l8-2v10"/>
        <circle cx="4" cy="13" r="2"/>
        <circle cx="12" cy="11" r="2"/>
      </svg>
    )
    case 'file': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z"/>
        <path d="M9 1.5V6h4.5"/>
      </svg>
    )
    case 'code': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <path d="M5 4L1.5 8 5 12"/>
        <path d="M11 4l3.5 4-3.5 4"/>
        <path d="M9.5 2.5l-3 11"/>
      </svg>
    )
    case 'convert': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <path d="M3 8h10M8 3l5 5-5 5"/>
      </svg>
    )
    case 'watermark': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <circle cx="8" cy="8" r="6"/>
        <path d="M5 11l2-6 2 4 1-2 2 4" strokeLinejoin="round"/>
      </svg>
    )
    case 'ai': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <path d="M8 1v14M1 8h14"/>
        <circle cx="8" cy="8" r="3"/>
      </svg>
    )
    case 'metadata': return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <circle cx="8" cy="8" r="6"/>
        <path d="M8 7v4M8 5.5h.01"/>
      </svg>
    )
    default: return (
      <svg {...s} viewBox="0 0 16 16" {...p}>
        <circle cx="4" cy="8" r="1"/>
        <circle cx="8" cy="8" r="1"/>
        <circle cx="12" cy="8" r="1"/>
      </svg>
    )
  }
}

/* ── Micro icons ─────────────────────────────────────────────────── */
const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round">
    <circle cx="3.5" cy="8" r="1"/>
    <circle cx="8"   cy="8" r="1"/>
    <circle cx="12.5"cy="8" r="1"/>
  </svg>
)
const ChevronIcon = ({ open }) => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
       style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--t-base)' }}>
    <path d="M2 3.5l3 3 3-3"/>
  </svg>
)
