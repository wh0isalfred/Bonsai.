import { useState } from 'react'
import BonsaiLogo      from './components/BonsaiLogo'
import { TABS }        from './config/tabs'
import ImageCompressor from './pages/ImageCompressor'
import ComingSoon      from './components/ComingSoon'

export default function App() {
  const [activeTab, setActiveTab] = useState('images')

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Header ── */}
        <header className="flex items-center gap-3 mb-6">
          <BonsaiLogo size={36} />
          <div>
            <h1 className="text-xl font-medium text-zinc-900 leading-none tracking-tight">
              bonsai<span className="text-blue-500">.</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">Smart file compression</p>
          </div>
          <span className="ml-auto text-[11px] bg-blue-50 text-blue-500 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
            beta
          </span>
        </header>

        {/* ── Nav ── */}
        <nav className="flex gap-1 p-1 bg-white border border-zinc-100 rounded-xl mb-6" aria-label="File type">
  {TABS.map(({ id, label, ready, icon: Icon }) => (
    <button
      key={id}
      onClick={() => ready && setActiveTab(id)}
      disabled={!ready}
      className={[
        'relative flex items-center gap-1.5 flex-1 justify-center px-2 py-2 rounded-lg text-xs font-medium',
        'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
        activeTab === id
          ? 'bg-blue-500 text-white shadow-sm'
          : ready
            ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
            : 'text-zinc-300 cursor-not-allowed',
      ].join(' ')}
    >
      <Icon size={14} />
      <span>{label}</span>

      {!ready && (
        <span className="absolute -top-1.5 -right-1 text-[8px] font-semibold px-1 py-px rounded-full bg-zinc-100 text-zinc-400 leading-tight">
          soon
        </span>
      )}
    </button>
  ))}
</nav>

        {/* ── Page content ── */}
        {activeTab === 'images' && <ImageCompressor />}
        {activeTab !== 'images' && (
          <ComingSoon tab={TABS.find(t => t.id === activeTab)} />
        )}

      </div>
    </div>
  )
}
