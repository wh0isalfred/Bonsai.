import { useCallback, useState, useRef } from 'react'

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.avif,image/*'

export default function DropZone({ onFiles, hasFiles = false }) {
  const [dragging, setDragging] = useState(false)
  const inputRef    = useRef(null)
  const dragCounter = useRef(0)

  const handleFiles = useCallback((fileList) => {
  const file = fileList?.[0]
  if (!file || !file.type.startsWith('image/')) return
  onFiles([file]) // only one file
}, [onFiles])

  const onDragEnter = useCallback((e) => { e.preventDefault(); dragCounter.current++; setDragging(true) }, [])
  const onDragLeave = useCallback((e) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setDragging(false) }, [])
  const onDragOver  = useCallback((e) => { e.preventDefault() }, [])
  const onDrop      = useCallback((e) => { e.preventDefault(); dragCounter.current = 0; setDragging(false); handleFiles(e.dataTransfer.files) }, [handleFiles])
  const onInputChange = useCallback((e) => { handleFiles(e.target.files); e.target.value = '' }, [handleFiles])

  // Compact strip when files are already present
  if (hasFiles) {
    return (
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer',
          'transition-all duration-150 select-none',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-zinc-200 hover:border-blue-300 bg-white',
        ].join(' ')}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED} onChange={onInputChange} className="sr-only" />
        <SmallTreeIcon />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 leading-tight">
            {dragging ? 'Replace image' : 'Upload new image'}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">PNG, JPG, WebP, AVIF — up to 50 MB</p>
        </div>
        <span className="flex-shrink-0 text-[11px] font-medium text-blue-500 border border-blue-200 bg-blue-50 px-2.5 py-1 rounded-lg">
          Browse
        </span>
      </div>
    )
  }

  // Full drop zone
  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        'relative flex flex-col items-center justify-center gap-3',
        'rounded-xl border-2 border-dashed px-6 py-14 cursor-pointer',
        'transition-all duration-150 select-none',
        dragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-zinc-200 hover:border-blue-300 hover:bg-blue-50/40 bg-white',
      ].join(' ')}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED} onChange={onInputChange} className="sr-only" />

      <TreeIcon dragging={dragging} />

      <div className="text-center">
        <p className="text-sm font-medium text-zinc-800">
          {dragging ? 'Drop image here' : 'Drop an image here'}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">PNG, JPG, WebP, AVIF — up to 50 MB</p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
        className="mt-1 px-4 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
      >
        Browse files
      </button>
    </div>
  )
}

function TreeIcon({ dragging }) {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true"
      className={`transition-transform duration-200 ${dragging ? 'scale-110' : ''}`}
    >
      <path d="M26 44 L26 34" stroke="#378ADD" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 44 L32 44" stroke="#378ADD" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26 34 C26 34 15 30 15 21 C15 15 19.9 11 26 11 C32.1 11 37 15 37 21 C37 30 26 34 26 34Z"
        fill="#EFF6FF" stroke="#378ADD" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M26 34 C26 34 19 27 19.5 20" stroke="#378ADD" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <path d="M26 34 C26 34 33 27 32.5 19" stroke="#378ADD" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <path d="M26 28 C26 28 21.5 23 22 17" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M26 28 C26 28 30.5 23 30 17" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <circle cx="26" cy="11" r="2.5" fill="#378ADD" />
    </svg>
  )
}

function SmallTreeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path d="M26 44 L26 34" stroke="#378ADD" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 44 L32 44" stroke="#378ADD" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26 34 C26 34 15 30 15 21 C15 15 19.9 11 26 11 C32.1 11 37 15 37 21 C37 30 26 34 26 34Z"
        fill="#EFF6FF" stroke="#378ADD" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
