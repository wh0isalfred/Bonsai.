/**
 * src/pages/ToolPage.jsx
 *
 * Key behaviours:
 *   - Clicking Smart or Pro while history is open → closes history, shows tool
 *   - View transitions: content fades + slides when switching views
 *   - Lazy tool loading per tool type
 *   - Below-fold content (brand, trust, how it works, philosophy)
 */
import { useState, lazy, Suspense, useCallback, useEffect, useRef } from 'react'
import Toolbar      from '../components/layout/Toolbar'
import ModeToggle   from '../components/ui/ModeToggle'
import HistoryPanel from '../features/history/HistoryPanel'
import { useModeStore }  from '../store/useModeStore'
import { useAuthStore }  from '../store/useAuthStore'

import compressionIllus from '../assets/illustrations/compression.webp'
import downloadIllus    from '../assets/illustrations/download.webp'
import uploadIllus      from '../assets/illustrations/upload.webp'
import optimIllus       from '../assets/illustrations/optimization.webp'

const TOOL_COMPONENTS = {
  image: lazy(() => import('../features/tools/image/index')),
  video: lazy(() => import('../features/tools/image/index')),
  audio: lazy(() => import('../features/tools/image/index')),
  file:  lazy(() => import('../features/tools/image/index')),
  code:  lazy(() => import('../features/tools/image/index')),
}

export default function ToolPage({ onPricing, onAuth }) {
  const [activeTool,   setActiveTool]   = useState('image')
  const [showHistory,  setShowHistory]  = useState(false)
  const [viewKey,      setViewKey]      = useState(0)   // bump to re-trigger animation
  const mode = useModeStore(s => s.mode)

  const isImageTool = activeTool === 'image'
  const ActiveTool  = TOOL_COMPONENTS[activeTool] ?? TOOL_COMPONENTS.image

  /* Close history when switching tools */
  const handleToolChange = useCallback((id) => {
    setActiveTool(id)
    setShowHistory(false)
    setViewKey(k => k + 1)
  }, [])

  /* Mode change from toggle — always closes history */
  const handleModeChange = useCallback(() => {
    if (showHistory) {
      setShowHistory(false)
      setViewKey(k => k + 1)
    }
  }, [showHistory])

  /* History toggle */
  const handleHistoryToggle = useCallback(() => {
    setShowHistory(v => !v)
    setViewKey(k => k + 1)
  }, [])

  return (
    <>
      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <Toolbar activeTool={activeTool} onChange={handleToolChange} />

      {/* ── Tool area ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.25rem 1.25rem 5rem' }}>

        {/* Mode + history controls (image tool only) */}
        {isImageTool && (
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   '1rem',
          }}>
            {/* Mode toggle — passes callback so mode switch closes history */}
            <ModeToggle onModeChange={handleModeChange} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FreeBadge />
              <HistoryButton
                active={showHistory}
                onClick={handleHistoryToggle} />
            </div>
          </div>
        )}

        {/* Content with enter animation keyed to viewKey */}
        <div key={viewKey} className="view-enter">
          {showHistory && isImageTool ? (
            <HistoryPanel />
          ) : (
            <Suspense fallback={<ToolSkeleton />}>
              <ActiveTool onAuth={onAuth} />
            </Suspense>
          )}
        </div>
      </div>

      {/* ── Below fold ────────────────────────────────────────────── */}
      <BelowFold onPricing={onPricing} onAuth={onAuth} />
    </>
  )
}

/* ── Free badge ─────────────────────────────────────────────────────── */
function FreeBadge() {
  const mode = useModeStore(s => s.mode)
  const plan = useAuthStore(s => s.plan)
  if (mode !== 'pro' || plan === 'pro') return null
  return (
    <span style={{
      fontSize:      '.58rem',
      fontWeight:    700,
      letterSpacing: '.05em',
      textTransform: 'uppercase',
      padding:       '2px 8px',
      borderRadius:  99,
      background:    'var(--surface-2)',
      color:         'var(--t-tertiary)',
      border:        '1px solid var(--border)',
      animation:     'fade-up .2s ease both',
    }}>
      Free preview
    </span>
  )
}

/* ── History button ─────────────────────────────────────────────────── */
function HistoryButton({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={active ? 'Back to tool' : 'Compression history'}
      aria-pressed={active}
      style={{
        width:          34,
        height:         34,
        borderRadius:   'var(--r-sm)',
        border:         `1px solid ${active ? 'var(--c-border)' : 'var(--border)'}`,
        background:     active ? 'var(--c-bg)' : 'transparent',
        color:          active ? 'var(--c)' : 'var(--t-tertiary)',
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        transition:     'all .2s ease',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background  = 'var(--surface-2)'
          e.currentTarget.style.color       = 'var(--t-secondary)'
          e.currentTarget.style.borderColor = 'var(--border-2)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background  = 'transparent'
          e.currentTarget.style.color       = 'var(--t-tertiary)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }
      }}>
      <HistoryIcon />
    </button>
  )
}

/* ── Tool loading skeleton ──────────────────────────────────────────── */
function ToolSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 240, borderRadius: 'var(--r-xl)' }} />
      <div className="skeleton" style={{ height: 52, borderRadius: 'var(--r-md)' }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   BELOW FOLD
   ══════════════════════════════════════════════════════════════════════ */
function BelowFold({ onPricing, onAuth }) {
  return (
    <div style={{ background: 'var(--ink-2)' }}>

      {/* Brand moment */}
      <section style={{
        position:   'relative',
        overflow:   'hidden',
        padding:    'clamp(3rem,6vw,5rem) 1.25rem',
        textAlign:  'center',
      }}>
        <div style={{
          position:   'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, var(--c-bg), transparent 72%)',
        }} />

        <p style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: 'var(--c)', margin: '0 0 .5rem' }}>
          Image compression
        </p>
        <h2 style={{
          fontFamily: 'var(--font-brand)', fontWeight: 700,
          fontSize:   'clamp(1.7rem,4vw,2.5rem)', letterSpacing: '-.04em',
          lineHeight: 1.1, color: 'var(--t-primary)', margin: '0 0 .6rem',
        }}>
          Trim the size.{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--c)' }}>Keep the quality.</em>
        </h2>
        <p style={{ fontSize: '.88rem', color: 'var(--t-secondary)',
                    maxWidth: 420, margin: '0 auto .85rem', lineHeight: 1.65 }}>
          Professional compression that runs entirely in your browser.
          Your images never leave your device.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center',
                      gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onAuth}>
            Start compressing free
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5h9M7 2.5l4 4-4 4"/>
            </svg>
          </button>
          <button className="btn btn-ghost" onClick={onPricing}>See pricing</button>
        </div>
      </section>

      {/* Trust strip */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        flexWrap:      'wrap',
        gap:           'clamp(.75rem,3vw,2rem)',
        padding:       '1rem 1.25rem',
        borderTop:     '1px solid var(--border)',
        borderBottom:  '1px solid var(--border)',
      }}>
        {[
          'Runs 100% in your browser',
          'Images never leave your device',
          'No account needed to start',
          'Free forever · Smart Mode',
        ].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%',
                           background: 'var(--c)', flexShrink: 0 }} />
            <span style={{ fontSize: '.72rem', color: 'var(--t-tertiary)' }}>{t}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <section id="how" style={{ padding: 'clamp(2.5rem,5vw,4rem) 1.25rem' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.12em',
                      textTransform: 'uppercase', color: 'var(--c)', margin: '0 0 .4rem' }}>
            How it works
          </p>
          <h2 style={{ fontFamily: 'var(--font-brand)', fontWeight: 700,
                       fontSize: 'clamp(1.2rem,3vw,1.7rem)', letterSpacing: '-.03em',
                       color: 'var(--t-primary)', margin: '0 0 1.75rem' }}>
            Three steps to a smaller file
          </h2>

          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap:                 16,
          }}
            className="stagger">
            {[
              { n:'01', title:'Drop your images',
                desc:'Free: up to 15 images per batch. Pro & Supporter: unlimited in both Smart and Pro modes. JPEG, PNG, WebP, AVIF.',
                img: uploadIllus, alt:'Upload' },
              { n:'02', title:'Set your level',
                desc:'Smart: pick a preset. Pro: fine-tune with live before/after preview.',
                img: compressionIllus, alt:'Compression settings' },
              { n:'03', title:'Download',
                desc:'Runs in your browser — nothing uploaded. Save files or grab a ZIP.',
                img: downloadIllus, alt:'Download' },
            ].map(s => (
              <div key={s.n} style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                overflow:     'hidden',
              }}>
                <div style={{ aspectRatio:'4/3', background:'var(--ink-3)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0,
                                background:'radial-gradient(ellipse 80% 60% at 50% 70%,var(--c-bg),transparent)' }}/>
                  <img src={s.img} alt={s.alt} style={{
                    width:'72%', height:'72%', objectFit:'contain',
                    position:'relative', zIndex:1,
                    filter:'drop-shadow(0 8px 24px rgba(0,0,0,.35))',
                  }}/>
                </div>
                <div style={{ padding:'16px 18px 18px' }}>
                  <p style={{ fontFamily:'var(--font-brand)', fontStyle:'italic',
                              fontWeight:300, fontSize:'1.5rem', color:'var(--border-3)',
                              lineHeight:1, margin:'0 0 8px' }}>{s.n}</p>
                  <p style={{ fontSize:'.88rem', fontWeight:700, color:'var(--t-primary)',
                              margin:'0 0 .35rem' }}>{s.title}</p>
                  <p style={{ fontSize:'.75rem', color:'var(--t-secondary)',
                              lineHeight:1.6, margin:0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section style={{ padding:'0 1.25rem clamp(2.5rem,5vw,4rem)' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <div style={{
            background:          'var(--surface)',
            border:              '1px solid var(--border)',
            borderRadius:        'var(--r-2xl)',
            overflow:            'hidden',
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          }}>
            <div style={{ padding:'clamp(1.5rem,4vw,2.5rem)',
                          display:'flex', flexDirection:'column',
                          justifyContent:'center', gap:'1rem' }}>
              <div>
                <p style={{ fontSize:'.6rem', fontWeight:700, letterSpacing:'.12em',
                            textTransform:'uppercase', color:'var(--c)', margin:'0 0 .5rem' }}>
                  The Bonsai philosophy
                </p>
                <h2 style={{ fontFamily:'var(--font-brand)', fontWeight:700,
                             fontSize:'clamp(1.2rem,3vw,1.5rem)', letterSpacing:'-.03em',
                             color:'var(--t-primary)', margin:0 }}>
                  Pruned to{' '}
                  <em style={{ fontStyle:'italic', color:'var(--c)' }}>perfection.</em>
                </h2>
                <p style={{ fontSize:'.8rem', color:'var(--t-secondary)',
                            lineHeight:1.65, margin:'.5rem 0 0' }}>
                  A bonsai is refined by removing what is unnecessary —
                  leaving only what is essential. Compression works the same way.
                </p>
              </div>
              <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
                {['Removes redundant pixel data','Preserves visual quality','Leaves the essence intact'].map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%',
                                   background:'var(--c)', flexShrink:0 }}/>
                    <span style={{ fontSize:'.78rem', color:'var(--t-secondary)' }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background:'var(--ink-3)', display:'flex', alignItems:'center',
                          justifyContent:'center', padding:'2rem',
                          position:'relative', overflow:'hidden', minHeight:200 }}>
              <div style={{ position:'absolute', inset:0,
                            background:'radial-gradient(ellipse 70% 60% at 50% 60%,var(--c-bg),transparent)'}}/>
              <img src={optimIllus} alt="Bonsai being pruned" style={{
                maxWidth:'75%', maxHeight:240, objectFit:'contain',
                position:'relative', filter:'drop-shadow(0 12px 32px rgba(0,0,0,.45))',
              }}/>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 2"/>
  </svg>
)
