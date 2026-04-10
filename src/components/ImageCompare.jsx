import { useState, useRef } from 'react'

export default function ImageCompare({ before, after }) {
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  // Standard move logic
  const handleMove = (clientX) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = (x / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, percent)))
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden select-none touch-none bg-zinc-200"
      onMouseMove={(e) => isDragging && handleMove(e.clientX)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchMove={(e) => isDragging && handleMove(e.touches[0].clientX)}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* AFTER IMAGE (Background) */}
      <img
        src={after}
        alt="after"
        className="absolute inset-0 w-full h-full object-cover"
        draggable="false"
      />

      {/* BEFORE IMAGE (Foreground with Clipping) */}
      <img
        src={before}
        alt="before"
        className="absolute inset-0 w-full h-full object-cover"
        draggable="false"
        style={{ 
          // This "clips" the image based on the slider percentage
          // inset(top right bottom left)
          clipPath: `inset(0 ${100 - position}% 0 0)` 
        }}
      />

      {/* SLIDER LINE & HANDLE */}
      <div
        className="absolute inset-y-0 z-20 w-0.5 bg-white cursor-ew-resize"
        style={{ left: `${position}%` }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border border-zinc-300">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-zinc-400" />
            <div className="w-0.5 h-3 bg-zinc-400" />
          </div>
        </div>
      </div>

      {/* LABELS */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded bg-black/50 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md">
        Before
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded bg-black/50 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md">
        After
      </div>
    </div>
  )
}