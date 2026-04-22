// src/components/ui/ImageCompare.jsx
// Drag-to-compare before/after slider. Design tokens applied.
import { useState, useRef, useCallback } from 'react'

export default function ImageCompare({ before, after }) {
  const [pos,   setPos]    = useState(50)
  const [ratio, setRatio]  = useState(16 / 9)
  const dragging  = useRef(false)
  const container = useRef(null)
  const handle    = useRef(null)

  const onAfterLoad = useCallback(e => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    if (w && h) setRatio(w / h)
  }, [])

  const pct = useCallback(x => {
    if (!container.current) return 50
    const r = container.current.getBoundingClientRect()
    return Math.max(2, Math.min(98, ((x - r.left) / r.width) * 100))
  }, [])

  const onPointerDown = useCallback(e => {
    e.preventDefault()
    dragging.current = true
    handle.current?.setPointerCapture(e.pointerId)
  }, [])
  const onPointerMove = useCallback(e => { if (dragging.current) setPos(pct(e.clientX)) }, [pct])
  const onPointerUp   = useCallback(() => { dragging.current = false }, [])
  const onClick       = useCallback(e => {
    if (!handle.current?.contains(e.target)) setPos(pct(e.clientX))
  }, [pct])

  return (
    <div ref={container} onClick={onClick}
      style={{
        position:    'relative',
        width:       '100%',
        aspectRatio: ratio,
        borderRadius:'var(--r-lg)',
        overflow:    'hidden',
        background:  'var(--c-sand)',
        cursor:      'col-resize',
        userSelect:  'none',
        boxShadow:   'var(--shadow-sm)',
      }}>

      {/* After — full */}
      <img src={after} alt="After compression" onLoad={onAfterLoad} draggable="false"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />

      {/* Before — clipped left of divider */}
      <img src={before} alt="Before compression" draggable="false"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                 objectFit: 'contain', clipPath: `inset(0 ${100 - pos}% 0 0)` }} />

      {/* Divider */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: `${pos}%`, width: 1.5,
        background: 'rgba(255,255,255,.85)',
        zIndex: 10, pointerEvents: 'none',
      }} />

      {/* Handle */}
      <div ref={handle}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        style={{
          position:    'absolute',
          top:         '50%',
          left:        `${pos}%`,
          transform:   'translate(-50%,-50%)',
          zIndex:      20,
          width:       34,
          height:      34,
          borderRadius:'50%',
          background:  '#fff',
          border:      '1.5px solid var(--c-clay)',
          boxShadow:   'var(--shadow-md)',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          cursor:      'ew-resize',
          touchAction: 'none',
        }}>
        <HandleIcon />
      </div>

      {/* Labels */}
      <Label text="Before" side="left" />
      <Label text="After"  side="right" />
    </div>
  )
}

function Label({ text, side }) {
  return (
    <div style={{
      position:    'absolute',
      bottom:      10,
      [side]:      10,
      zIndex:      15,
      fontSize:    '.6rem',
      fontWeight:  700,
      letterSpacing:'.06em',
      textTransform:'uppercase',
      padding:     '3px 7px',
      borderRadius:4,
      background:  'rgba(12,27,17,.55)',
      color:       '#fff',
      pointerEvents:'none',
    }}>
      {text}
    </div>
  )
}

const HandleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--c-stone)"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2.5L1 6.5L4 10.5"/>
    <path d="M9 2.5L12 6.5L9 10.5"/>
  </svg>
)
