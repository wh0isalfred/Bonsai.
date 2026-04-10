import { formatBytes, savingsPercent } from '../hooks/formatBytes'

export default function ResultsBar({ totalOriginal, totalCompressed, allSettled, onDownloadAll, onClearAll }) {
  if (!totalCompressed) return null
  const savings = savingsPercent(totalOriginal, totalCompressed)

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
      <div className="flex gap-5 flex-1 flex-wrap">
        <Stat label="Before" value={formatBytes(totalOriginal)} />
        <Stat label="After"  value={formatBytes(totalCompressed)} />
        <Stat label="Saved"  value={`${savings}%`} accent />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-600 hover:bg-white border border-transparent hover:border-zinc-100 transition-all"
        >
          Clear
        </button>
        {allSettled && (
          <button
            onClick={onDownloadAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Download all
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-[10px] text-blue-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium ${accent ? 'text-blue-600' : 'text-zinc-700'}`}>{value}</p>
    </div>
  )
}
