import { useState, useRef, useCallback } from 'react'

export default function ImageCompare({ before, after }) {
  const [position, setPosition] = useState(50)
  const [naturalAspect, setNaturalAspect] = useState(16 / 9)
  const isDragging   = useRef(false)
  const containerRef = useRef(null)
  const handleRef    = useRef(null)

  // Read the natural aspect ratio from the after image once it loads
  const onAfterLoad = useCallback((e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalWidth && naturalHeight) {
      setNaturalAspect(naturalWidth / naturalHeight)
    }
  }, [])

  const getPercent = useCallback((clientX) => {
    if (!containerRef.current) return 50
    const rect = containerRef.current.getBoundingClientRect()
    const x    = Math.max(0, Math.min(clientX - rect.left, rect.width))
    return (x / rect.width) * 100
  }, [])

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    isDragging.current = true
    handleRef.current?.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return
    setPosition(getPercent(e.clientX))
  }, [getPercent])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const onContainerClick = useCallback((e) => {
    if (handleRef.current?.contains(e.target)) return
    setPosition(getPercent(e.clientX))
  }, [getPercent])

  return (
    <div
      ref={containerRef}
      onClick={onContainerClick}
      className="relative w-full rounded-xl overflow-hidden select-none bg-zinc-100 cursor-col-resize"
      style={{ aspectRatio: naturalAspect }}
    >
      {/* AFTER — full canvas */}
      <img
        src={after}
        alt="After compression"
        onLoad={onAfterLoad}
        className="absolute inset-0 w-full h-full object-contain"
        draggable="false"
      />

      {/* BEFORE — clipped to the left of the slider */}
      <img
        src={before}
        alt="Before compression"
        className="absolute inset-0 w-full h-full object-contain"
        draggable="false"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-px bg-white z-10 pointer-events-none"
        style={{ left: `${position}%` }}
      />

      {/* Handle */}
      <div
        ref={handleRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute top-1/2 z-20 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-white rounded-full border border-zinc-200 flex items-center justify-center cursor-ew-resize"
        style={{ left: `${position}%`, touchAction: 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-400">
          <path d="M4 3L1 7L4 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 3L13 7L10 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Before
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        After
      </div>
    </div>
  )
}
