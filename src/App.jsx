import { useState } from 'react'
import BonsaiLogo      from './components/BonsaiLogo'
import { TABS }        from './config/tabs'
import ImageCompressor from './pages/ImageCompressor'
import ComingSoon      from './components/ComingSoon'

export default function App() {
  const [activeTab, setActiveTab] = useState('images')

  return (
    <div className="min-h-screen" style={{ background: '#F5F1E8', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top marketing navbar ── */}
      <header style={{ background: '#1F3D2B', borderBottom: '1px solid rgba(76,175,80,0.2)' }}>
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <BonsaiLogo size={32} />
            <span className="text-lg font-bold tracking-tight" style={{ color: '#F5F1E8', letterSpacing: '-0.5px' }}>
              Bonsai
            </span>
            {/* <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
              style={{ background: 'rgba(76,175,80,0.25)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)' }}>
              eden
            </span> */}
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            {['How it works', 'Pricing'].map(label => (
              <a key={label} href="#"
                className="text-sm transition-colors"
                style={{ color: 'rgba(245,241,232,0.7)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F5F1E8'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,232,0.7)'}>
                {label}
              </a>
            ))}
          </nav>

          {/* Sign up CTA */}
          <button className="text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: '#4CAF50', color: '#fff', border: 'none' }}>
            Sign up free
          </button>
        </div>
      </header>

      {/* ── Hero tagline ── */}
      <div className="text-center py-10 pb-6" style={{ background: 'linear-gradient(180deg, rgba(31,61,43,0.04) 0%, transparent 100%)' }}>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1F3D2B', letterSpacing: '-1px' }}>
          Trim the size.
          <span style={{ color: '#4CAF50' }}> Keep the quality.</span>
        </h1>
        <p className="text-sm mt-2" style={{ color: '#6B4F3A' }}>
          Professional image compression — lossless precision, elegant results.
        </p>
      </div>

      {/* ── Tool area ── */}
      <main className="max-w-2xl mx-auto px-4 pb-16">

        {/* File type nav */}
        <nav className="flex gap-1 p-1 rounded-2xl mb-6"
          style={{ background: '#fff', border: '1px solid #E8E4DC' }}
          aria-label="File type">
          {TABS.map(({ id, label, icon: Icon, ready }) => (
            <button
              key={id}
              onClick={() => ready && setActiveTab(id)}
              disabled={!ready}
              className="relative flex items-center gap-1.5 flex-1 justify-center px-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 focus:outline-none"
              style={{
                background: activeTab === id ? '#1F3D2B' : 'transparent',
                color:      activeTab === id
                  ? '#F5F1E8'
                  : ready ? '#6B4F3A' : '#D9D9D9',
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

        {/* Page content */}
        {activeTab === 'images' && <ImageCompressor />}
        {activeTab !== 'images' && <ComingSoon tab={TABS.find(t => t.id === activeTab)} />}

      </main>

      {/* ── Footer ── */}
      <footer className="text-center pb-8">
        <p className="text-xs" style={{ color: '#D9D9D9' }}>
          Bonsai · Trim the size, keep the quality
          <span className="mx-2">·</span>
          <span style={{ color: '#6B4F3A' }}>No file size limits on free plan</span>
        </p>
      </footer>
    </div>
  )
}
