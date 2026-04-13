import { PRESETS } from '../config/presets'
import { formatBytes } from '../hooks/formatBytes'

export default function SettingsPanel({ preset, onSelect, previews = {} }) {
  return (
    <div className="flex flex-col gap-2">
      {PRESETS.map(p => {
        const active   = preset === p.id
        const preview  = previews[p.id]
        const loading  = preview?.loading ?? false
        const size     = preview?.size    ?? null

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

                <div className={`flex items-center gap-1.5 mt-1 ${active ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {loading ? (
                    <span className={[
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium',
                      active ? 'bg-blue-100 text-blue-400' : 'bg-zinc-100 text-zinc-400',
                    ].join(' ')}>
                      <SpinnerIcon />
                      Calculating…
                    </span>
                  ) : size !== null ? (
                    <>
                      <span className="text-xs">Size:</span>
                      <span className={[
                        'px-2 py-0.5 rounded-md text-xs font-medium',
                        active ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-600',
                      ].join(' ')}>
                        {formatBytes(size)}
                      </span>
                    </>
                  ) : null}
                </div>

                <p className={`text-xs mt-1.5 ${active ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {p.description}
                </p>
              </div>

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

// Self-contained spinner — no tailwind-animate plugin dependency
function SpinnerIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      style={{
        animation: 'bonsai-spin 0.75s linear infinite',
      }}
    >
      <style>{`@keyframes bonsai-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
      <path d="M5 1 A4 4 0 0 1 9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
