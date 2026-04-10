import { PRESETS } from '../config/presets'
import { formatBytes } from '../hooks/formatBytes'

export default function SettingsPanel({ preset, onSelect, files }) {
  // Total original size of all staged files
  const totalOriginal = files.reduce((acc, f) => acc + (f.size ?? 0), 0)

  return (
    <div className="flex flex-col gap-2">
      {PRESETS.map(p => {
        const active        = preset === p.id
        const estimatedSize = totalOriginal > 0
          ? Math.round(totalOriginal * p.estimatedRatio)
          : null

        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={[
              'w-full text-left px-4 py-4 rounded-xl border transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
              active
                ? 'border-blue-400 bg-blue-50'
                : 'border-zinc-100 bg-white hover:border-zinc-200',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${active ? 'text-blue-500' : 'text-zinc-800'}`}>
                  {p.label}
                </p>
                {estimatedSize !== null && (
                  <p className={`text-xs mt-1 ${active ? 'text-blue-400' : 'text-zinc-400'}`}>
                    Estimated size:&nbsp;
                    <span className={[
                      'inline-block px-2 py-0.5 rounded-md text-xs font-medium ml-0.5',
                      active ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-600',
                    ].join(' ')}>
                      {formatBytes(estimatedSize)}
                    </span>
                  </p>
                )}
                <p className={`text-xs mt-2 ${active ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {p.description}
                </p>
              </div>

              {/* Radio dot */}
              <div className={[
                'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                active ? 'border-blue-500 bg-blue-500' : 'border-zinc-300 bg-white',
              ].join(' ')}>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
