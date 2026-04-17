import { useState } from 'react'
import BonsaiLogo    from './components/BonsaiLogo'
import { TABS }      from './config/tabs'
import ImageCompressor from './pages/ImageCompressor'
import ComingSoon    from './components/ComingSoon'
import HistoryPanel  from './components/HistoryPanel'
import { useImageCompress } from './hooks/useImageCompress'


export default function App() {
  const [activePage, setActivePage] = useState('tool')  // 'tool' | 'pricing'

  return (
    <div className="min-h-screen" style={{ background: '#F5F1E8', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Sticky top navbar ── */}
      <header style={{
        background: '#1F3D2B',
        borderBottom: '1px solid rgba(76,175,80,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => setActivePage('tool')}
            className="flex items-center gap-2.5 focus:outline-none"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <BonsaiLogo size={32} />
            <span className="text-2xl font-black" style={{color: '#F5F1E8',letterSpacing: '-0.5px'}}><span style={{color: '#4CAF50'}}>Bon</span>sai</span>
          </button>

          <div className="hidden md:flex items-center ml-auto">
  
  {/* Center nav */}
  <nav className="flex items-center gap-7 mr-6">
    <NavLink label="How it works" onClick={() => { setActivePage('tool')
    setTimeout(() => {
      document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }}/>
    <NavLink
      label="Pricing"
      onClick={() => setActivePage('pricing')}
      active={activePage === 'pricing'}
    />
  </nav>

  {/* Divider */}
  <span
    style={{
      width: '1px',
      height: '16px',
      background: 'rgba(245,241,232,0.2)',
      marginRight: '16px'
    }}
  />

  {/* CTA */}
  <button
  className="group relative overflow-hidden text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200 active:scale-[0.97] hover:scale-[1.04] hover:shadow-[0_6px_18px_rgba(76,175,80,0.25)]"
  style={{
  background: '#4CAF50',
  color: '#F5F1E8',
  border: 'none',
  letterSpacing: '0.01em',
  boxShadow: '0 0 0 rgba(76,175,80,0)',
  
}}
>
  Sign up free

  {/* subtle leaf particles */}
  <span
    className="absolute inset-0 pointer-events-none"
  >
    <span className="leaf leaf-1" />
    <span className="leaf leaf-2" />
  </span>
</button>

</div>
        </div>
      </header>

      {activePage === 'pricing' ? (
        <PricingPage onBack={() => setActivePage('tool')} />
      ) : (
        <ToolPage />
      )}

      {/* Footer */}
      <footer className="text-center py-6 mt-4" style={{ borderTop: '1px solid #E8E4DC' }}>
        <p className="text-xs" style={{ color: '#a1a1a1' }}>
          Bonsai — all compression runs in your browser. Your images never leave your device.
          <span className="mx-2">·</span>
          <button onClick={() => setActivePage('pricing')}
            className="underline" style={{ color: '#6B4F3A', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>
            Pricing
          </button>
        </p>
      </footer>
    </div>
  )
}

// ── Tool page (main) ──────────────────────────────────────────────────────────
function ToolPage() {
  const [activeTab,  setActiveTab]  = useState('images')
  const [activeView, setActiveView] = useState('compress') // 'compress' | 'history'

  // History lives here so it persists across tab switches
  const { historyEntries, clearHistory } = useImageCompress()

  return (
    <>
      {/* Hero */}
      <div className="text-center py-10 pb-6"
        style={{ background: 'linear-gradient(180deg, rgba(31,61,43,0.05) 0%, transparent 100%)' }}>
        <h1 className="text-3xl font-black" style={{ color: '#2A2A2A', letterSpacing: '-1px' }}>
            Trim the size.
            <span style={{ color: '#4CAF50' }}> Keep the quality.</span>
          </h1>
        <p className="text-sm mt-2" style={{ color: '#6B4F3A' }}>
          Professional image compression — pruned to perfection.
        </p>

      </div>

      <main className="max-w-2xl mx-auto px-4 pb-16">

        {/* File type nav */}
        <nav className="flex gap-1 p-1 rounded-2xl mb-5"
          style={{ background: '#fff', border: '1px solid #E8E4DC' }}>
          {TABS.map(({ id, label, icon: Icon, ready }) => (
            <button key={id}
              onClick={() => ready && setActiveTab(id)}
              disabled={!ready}
              className="relative flex items-center gap-1.5 flex-1 justify-center px-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 focus:outline-none"
              style={{
                background: activeTab === id ? '#1F3D2B' : 'transparent',
                color: activeTab === id ? '#F5F1E8' : ready ? '#6B4F3A' : '#D9D9D9',
                cursor: ready ? 'pointer' : 'not-allowed',
              }}>
              <Icon />
              <span>{label}</span>
              {!ready && (
                <span className="absolute -top-1.5 -right-0.5 text-[8px] font-bold px-1 py-px rounded-full"
                  style={{ background: '#F5F1E8', color: '#D9D9D9', border: '1px solid #E8E4DC' }}>
                  soon
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Compress / History secondary nav */}
        {activeTab === 'images' && (
          <div className="flex gap-0.5 mb-5 p-0.5 rounded-xl"
            style={{ background: '#E8E4DC', width: 'fit-content' }}>
            {[
              { id: 'compress', label: 'Compress' },
              { id: 'history',  label: `History${historyEntries.length > 0 ? ` (${historyEntries.length})` : ''}` },
            ].map(v => (
              <button key={v.id}
                onClick={() => setActiveView(v.id)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activeView === v.id ? '#fff' : 'transparent',
                  color: activeView === v.id ? '#1F3D2B' : '#6B4F3A',
                  boxShadow: activeView === v.id ? '0 1px 3px rgba(31,61,43,0.1)' : 'none',
                }}>
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {activeTab === 'images' && activeView === 'compress' && <ImageCompressor />}
        {activeTab === 'images' && activeView === 'history'  && (
          <HistoryPanel entries={historyEntries} onClear={clearHistory} />
        )}
        {activeTab !== 'images' && <ComingSoon tab={TABS.find(t => t.id === activeTab)} />}
      </main>

      {/* How it works */}
      <section id="how" className="max-w-2xl mx-auto px-4 pb-16">
        <HowItWorks />
      </section>
    </>
  )
}

// ── Smart / Pro mode toggle ───────────────────────────────────────────────────
// This is a display-only pill for now — wiring to settings mode happens in SettingsPanel
function ModeToggle() {
  const [mode, setMode] = useState('smart')  // 'smart' | 'pro'

  return (
    <div className="inline-flex items-center rounded-2xl p-0.5"
      style={{ background: 'rgba(31,61,43,0.08)', border: '1px solid rgba(31,61,43,0.12)' }}>
      {[
        { id: 'smart', label: '⚡ Smart', desc: 'One click' },
        { id: 'pro',   label: '🎛 Pro',   desc: 'Full control' },
      ].map(m => (
        <button key={m.id}
          onClick={() => setMode(m.id)}
          className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-150"
          style={{
            background: mode === m.id ? '#1F3D2B' : 'transparent',
            color: mode === m.id ? '#F5F1E8' : '#6B4F3A',
          }}>
          {m.label}
          <span className="ml-1.5 text-[10px] font-normal opacity-70">{m.desc}</span>
        </button>
      ))}
    </div>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Drop your images', body: 'Drag anywhere, paste from clipboard, or browse. JPEG, PNG, WebP, AVIF — up to 100 MB.' },
    { n: '02', title: 'Choose your level', body: 'Pick Extreme, High, Normal or Low. See the exact output size before you compress.' },
    { n: '03', title: 'Hit Compress', body: 'Watch the leaves fall as your images are refined in seconds — entirely in your browser.' },
    { n: '04', title: 'Download', body: 'Download individually or as a ZIP. Drag the before/after slider to see exactly what changed.' },
  ]
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E4DC', background: '#fff' }}>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid #F0EDE6' }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#4CAF50' }}>How it works</p>
        <p className="text-lg font-black mt-0.5" style={{ color: '#1F3D2B' }}>Four steps, zero complexity</p>
      </div>
      <div className="grid grid-cols-2" style={{ borderColor: '#F0EDE6' }}>
        {steps.map((s, i) => (
          <div key={s.n} className="px-5 py-4"
            style={{
              borderRight:  i % 2 === 0 ? '1px solid #F0EDE6' : 'none',
              borderBottom: i < 2       ? '1px solid #F0EDE6' : 'none',
            }}>
            <span className="text-[11px] font-black" style={{ color: '#6B4F3A' }}>{s.n}</span>
            <p className="text-sm font-bold mt-1" style={{ color: '#1F3D2B' }}>{s.title}</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6B4F3A' }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Pricing page ──────────────────────────────────────────────────────────────
function PricingPage({ onBack }) {
  const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    highlight: false,
    badge: null,
    description: 'Clean, reliable compression — no sign up, no friction.',
    features: [
      'Unlimited image compression',
      'JPEG, PNG, WebP, AVIF support',
      'Up to 20 images per batch',
      'Before / after comparison slider',
      'Preset compression levels',
      'Runs fully in your browser (private)',
      'Manual download (no ZIP)',
      'Basic quality control',
    ],
    cta: 'Start compressing',
    ctaStyle: {
      background: 'transparent',
      color: '#1F3D2B',
      border: '1.5px solid #1F3D2B',
    },
  },

  {
    name: 'Pro',
    price: '$5',
    period: '/month',
    highlight: true,
    badge: 'For creators',
    description: 'More control, faster workflow, better output decisions.',
    features: [
      'Everything in Free',
      'Bulk ZIP download',
      'Live quality preview slider',
      'Higher batch limits (100+ files)',
      'Faster processing priority',
      'Advanced compression tuning',
      'File size targeting (coming soon)',
      'Save last-used settings',
    ],
    cta: 'Upgrade to Pro',
    ctaStyle: {
      background: '#1F3D2B',
      color: '#F5F1E8',
      border: 'none',
    },
  },

  {
    name: 'Supporter',
    price: '$2',
    period: '/month',
    highlight: false,
    badge: null,
    description: 'Support the product — unlock small quality-of-life upgrades.',
    features: [
      'No ads, ever',
      'Slightly higher batch limits',
      'Faster queue priority',
      'Early access to new features',
      'Support independent development',
    ],
    cta: 'Support Bonsai',
    ctaStyle: {
      background: 'transparent',
      color: '#1F3D2B',
      border: '1.5px solid #1F3D2B',
    },
  },
]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm mb-8 focus:outline-none"
        style={{ color: '#6B4F3A', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.color = '#1F3D2B'}
        onMouseLeave={e => e.currentTarget.style.color = '#6B4F3A'}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back to tool
      </button>

      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: '#4CAF50' }}>Pricing</p>
        <h2 className="text-3xl font-black" style={{ color: '#1F3D2B', letterSpacing: '-1px' }}>
          Simple, transparent pricing
        </h2>
        <p className="text-sm mt-2" style={{ color: '#6B4F3A' }}>
          No hidden fees. No compression limits on the free plan. Cancel any time.
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map(plan => (
          <div key={plan.name} className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              border: `${plan.highlight ? '2px' : '1.5px'} solid ${plan.highlight ? '#4CAF50' : '#E8E4DC'}`,
              background: plan.highlight
  ? 'rgba(76,175,80,0.03)'
  : '#fff'
            }}>

            <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid #F0EDE6' }}>
              {plan.badge && (
                <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
                  style={{ background: '#1F3D2B', color: '#F5F1E8' }}>
                  {plan.badge}
                </span>
              )}
              <p className="text-lg font-black" style={{ color: '#1F3D2B' }}>{plan.name}</p>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-3xl font-black" style={{ color: '#1F3D2B', letterSpacing: '-1.5px' }}>
                  {plan.price}
                </span>
                <span className="text-xs" style={{ color: '#6B4F3A' }}>{plan.period}</span>
              </div>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: '#6B4F3A' }}>{plan.description}</p>
            </div>

            <ul className="px-6 py-5 flex flex-col gap-2.5 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-xs" style={{ color: '#2A2A2A' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-px">
                    <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="#4CAF50" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <div className="px-6 pb-6">
              <button className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                style={plan.ctaStyle}>
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trust note */}
      <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
        {[
          '🔒 Images never leave your device',
          '🚫 No credit card required for free',
          '↩ Cancel any time',
        ].map(s => (
          <span key={s} className="text-xs" style={{ color: '#6B4F3A' }}>{s}</span>
        ))}
      </div>
    </div>
  )
}

// ── Nav link helper ───────────────────────────────────────────────────────────
function NavLink({ label, href, onClick, active }) {
  return (
    <a
      href={href ?? '#'}
      onClick={e => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
      className="text-sm transition-all duration-150"
      style={{
        color: active ? '#F5F1E8' : 'rgba(245,241,232,0.65)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.color = '#F5F1E8'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.color = 'rgba(245,241,232,0.65)'
      }}
    >
      {label}
    </a>
  )
}