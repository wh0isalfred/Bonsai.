export default function ComingSoon({ tab }) {
  if (!tab) return null
  const Icon = tab.icon
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-xl border-2 border-dashed border-zinc-100 bg-white">
      <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300">
        <Icon size={22} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-500">{tab.label} compression</p>
        <p className="text-xs text-zinc-400 mt-1">Coming soon — we're working on it</p>
      </div>
    </div>
  )
}
