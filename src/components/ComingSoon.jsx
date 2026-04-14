export default function ComingSoon({ tab }) {
  if (!tab) return null
  const Icon = tab.icon
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border-2 border-dashed"
      style={{ borderColor: '#D9D9D9', background: 'rgba(245,241,232,0.5)' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: '#F5F1E8', border: '1px solid #D9D9D9', color: '#D9D9D9' }}>
        <Icon size={22} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: '#2A2A2A' }}>{tab.label} compression</p>
        <p className="text-xs mt-1" style={{ color: '#6B4F3A' }}>Coming soon — we're refining it</p>
      </div>
    </div>
  )
}
