import { formatBytes, savingsPercent } from '../hooks/formatBytes'

export default function FileCard({ file, onRemove, onRetry, onDownload }) {
  const { id, name, size, status, progress, result, error } = file
  const savings = result ? savingsPercent(size, result.compressedSize) : null

  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-zinc-100 bg-white group transition-all">

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {result?.url
          ? <img src={result.url} alt="" className="w-full h-full object-cover" />
          : <ImageIcon />
        }
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-800 truncate leading-tight">
          {name}
        </p>
        <div className="mt-1">
          {status === 'compressing' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[3px] rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400 tabular-nums w-7 text-right">{progress}%</span>
            </div>
          )}
          {status === 'idle' && (
            <span className="text-[11px] text-zinc-400">{formatBytes(size)} · ready</span>
          )}
          {status === 'done' && (
            <span className="text-[11px] text-zinc-400">
              {formatBytes(size)}
              <span className="mx-1 text-zinc-300">→</span>
              <span className="text-zinc-700 font-medium">{formatBytes(result.compressedSize)}</span>
            </span>
          )}
          {status === 'error' && (
            <span className="text-[11px] text-red-400 truncate block max-w-[200px]" title={error}>
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Right badges + actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {status === 'done' && savings !== null && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-500">
            -{savings}%
          </span>
        )}

        {status === 'done' && (
          <button
            onClick={() => onDownload(id)}
            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
            title="Download"
          >
            <DownloadIcon />
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={() => onRetry(id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            title="Retry"
          >
            <RetryIcon />
          </button>
        )}

        <button
          onClick={() => onRemove(id)}
          className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-100 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove"
        >
          <XIcon />
        </button>
      </div>
    </div>
  )
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-200">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
      <path d="M1.5 10.5 L4.5 7.5 L7.5 10.5 L10.5 7.5 L14.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2v7M4 7l3 3 3-3" /><path d="M2 11h10" />
    </svg>
  )
}

function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M2 7a5 5 0 1 0 1-3" /><path d="M2 2v3h3" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  )
}
