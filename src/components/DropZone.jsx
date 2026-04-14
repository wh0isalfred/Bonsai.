import { useCallback, useState, useRef } from 'react'

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.avif,image/*'

export default function DropZone({ onFiles, hasFiles = false, compressing = false }) {
  const [dragging, setDragging] = useState(false)
  const inputRef    = useRef(null)
  const dragCounter = useRef(0)

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (files.length) onFiles(files)
  }, [onFiles])

  const onDragEnter   = useCallback((e) => { e.preventDefault(); dragCounter.current++; setDragging(true) }, [])
  const onDragLeave   = useCallback((e) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setDragging(false) }, [])
  const onDragOver    = useCallback((e) => { e.preventDefault() }, [])
  const onDrop        = useCallback((e) => { e.preventDefault(); dragCounter.current = 0; setDragging(false); handleFiles(e.dataTransfer.files) }, [handleFiles])
  const onInputChange = useCallback((e) => { handleFiles(e.target.files); e.target.value = '' }, [handleFiles])

  if (hasFiles) {
    return (
      <div
        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer select-none transition-all duration-200"
        style={{
          border: `1.5px dashed ${dragging ? '#4CAF50' : '#D9D9D9'}`,
          background: dragging ? 'rgba(76,175,80,0.05)' : 'rgba(245,241,232,0.6)',
        }}>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} onChange={onInputChange} className="sr-only" />
        <SmallTreeIcon />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: '#2A2A2A' }}>
            {dragging ? 'Drop to add' : 'Add more images'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#6B4F3A' }}>PNG, JPG, WebP, AVIF — up to 100 MB</p>
        </div>
        <span className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: '#1F3D2B', color: '#F5F1E8' }}>
          Browse
        </span>
      </div>
    )
  }

  return (
    <div
      onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className="relative flex flex-col items-center justify-center gap-5 px-6 py-14 rounded-2xl cursor-pointer select-none transition-all duration-300"
      style={{
        border: `2px dashed ${dragging ? '#4CAF50' : '#D9D9D9'}`,
        background: dragging
          ? 'rgba(76,175,80,0.06)'
          : 'linear-gradient(160deg, rgba(245,241,232,0.8) 0%, rgba(255,255,255,0.95) 100%)',
      }}>
      <input ref={inputRef} type="file" multiple accept={ACCEPTED} onChange={onInputChange} className="sr-only" />

      {/* Animated bonsai tree */}
      <BonsaiAnimation dragging={dragging} compressing={compressing} />

      <div className="text-center">
        <p className="text-base font-semibold" style={{ color: '#1F3D2B' }}>
          {dragging ? 'Release to upload' : 'Drop your images here'}
        </p>
        <p className="text-sm mt-1" style={{ color: '#6B4F3A' }}>Trim the size. Keep the quality.</p>
        <p className="text-xs mt-0.5" style={{ color: '#D9D9D9' }}>PNG, JPG, WebP, AVIF — up to 100 MB each</p>
      </div>

      <button
        type="button"
        onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
        className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
        style={{ background: '#1F3D2B', color: '#F5F1E8' }}>
        Browse files
      </button>
    </div>
  )
}

function BonsaiAnimation({ dragging}) {
  return (
    <div className="relative" style={{ width: 80, height: 90 }}>
      <svg width="80" height="90" viewBox="0 0 80 90" fill="none" aria-hidden="true">
        {/* Pot */}
        <rect x="28" y="76" width="24" height="8" rx="2" fill="#6B4F3A" opacity="0.6" />
        <rect x="25" y="72" width="30" height="6" rx="2" fill="#6B4F3A" opacity="0.4" />

        {/* Trunk */}
        <path d="M40 72 L40 58" stroke="#6B4F3A" strokeWidth="3" strokeLinecap="round" />

        {/* Main branches */}
        <path d="M40 64 L30 54" stroke="#6B4F3A" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 60 L50 50" stroke="#6B4F3A" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 58 L35 46" stroke="#6B4F3A" strokeWidth="1.5" strokeLinecap="round" />

        {/* Leaf clusters — animate on drag/compress */}
        <g style={{ transition: 'opacity 0.4s, transform 0.4s', opacity: dragging ? 1 : 0.85 }}>
          {/* Main top cluster */}
          <ellipse cx="40" cy="34" rx="16" ry="12" fill="#4CAF50" opacity="0.25" />
          <ellipse cx="40" cy="34" rx="12" ry="9" fill="#4CAF50" opacity="0.35" />
          {/* Left cluster */}
          <ellipse cx="26" cy="46" rx="10" ry="8" fill="#4CAF50" opacity="0.3" />
          <ellipse cx="26" cy="46" rx="7" ry="5.5" fill="#4CAF50" opacity="0.4" />
          {/* Right cluster */}
          <ellipse cx="54" cy="42" rx="10" ry="8" fill="#4CAF50" opacity="0.3" />
          <ellipse cx="54" cy="42" rx="7" ry="5.5" fill="#4CAF50" opacity="0.4" />
          {/* Top accent */}
          <ellipse cx="40" cy="22" rx="8" ry="6" fill="#4CAF50" opacity="0.5" />
        </g>

        {/* Falling leaves when dragging */}
        {dragging && <>
          <circle cx="18" cy="52" r="3" fill="#4CAF50" opacity="0.6"
            style={{ animation: 'bonsai-fall 1.2s ease-in-out infinite' }} />
          <circle cx="62" cy="56" r="2.5" fill="#4CAF50" opacity="0.5"
            style={{ animation: 'bonsai-fall 1.5s ease-in-out 0.3s infinite' }} />
          <circle cx="22" cy="65" r="2" fill="#4CAF50" opacity="0.4"
            style={{ animation: 'bonsai-fall 1.8s ease-in-out 0.6s infinite' }} />
        </>}
      </svg>

      <style>{`
        @keyframes bonsai-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          100% { transform: translateY(20px) rotate(30deg); opacity: 0; }
        }
        @keyframes bonsai-sway {
          0%, 100% { transform: rotate(-1deg); }
          50%       { transform: rotate(1deg); }
        }
      `}</style>
    </div>
  )
}

function SmallTreeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 36 L20 27" stroke="#6B4F3A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 36 L24 36" stroke="#6B4F3A" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="20" cy="18" rx="11" ry="9" fill="#4CAF50" opacity="0.25" />
      <ellipse cx="20" cy="18" rx="8" ry="6.5" fill="#4CAF50" opacity="0.4" />
    </svg>
  )
}
