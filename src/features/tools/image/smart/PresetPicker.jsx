/**
 * src/features/tools/image/smart/PresetPicker.jsx
 * Shows estimated compressed size per preset alongside the quality bar.
 */
import { PRESETS } from '../../../../config/presets'
import { formatBytes } from '../../../../utils/formatBytes'

export default function PresetPicker({ selected, onSelect, presetSizes = {}, estimating = false }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, margin:'0 0 .65rem' }}>
        <p style={{ fontSize:'.6rem', fontWeight:700, letterSpacing:'.11em',
                    textTransform:'uppercase', color:'var(--c)', margin:0 }}>
          Compression level
        </p>
        {estimating && (
          <span style={{ display:'flex', alignItems:'center', gap:4,
                         fontSize:'.62rem', color:'var(--t-tertiary)' }}>
            <span className="spin" style={{
              display:'inline-block', width:9, height:9, borderRadius:'50%',
              border:'1.5px solid var(--border-2)', borderTopColor:'var(--c)',
            }}/>
            Estimating…
          </span>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8 }}>
        {PRESETS.map(p => (
          <PresetCard
            key={p.id}
            preset={p}
            active={selected === p.id}
            estimatedSize={presetSizes[p.id] ?? null}
            onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function PresetCard({ preset, active, estimatedSize, onSelect }) {
  const { id, label, sublabel, desc, qualityBar } = preset

  return (
    <button
      onClick={() => onSelect(id)}
      aria-pressed={active}
      style={{
        textAlign:'left', padding:'11px 13px 12px',
        borderRadius:'var(--r-md)',
        border:`1.5px solid ${active ? 'var(--c-border)' : 'var(--border)'}`,
        background: active ? 'var(--c-bg)' : 'var(--surface)',
        cursor:'pointer', display:'flex', flexDirection:'column',
        gap:6, transition:'border-color var(--t-fast), background var(--t-fast)',
        outline:'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border-3)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border)' }}>

      {/* Label + checkmark */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
        <span style={{
          fontFamily: 'var(--font-brand)', fontStyle: active ? 'italic' : 'normal',
          fontWeight: 700, fontSize: '.88rem',
          color: active ? 'var(--c)' : 'var(--t-primary)',
          transition: 'color var(--t-fast)',
        }}>
          {label}
        </span>
        {active && (
          <span style={{ fontSize:'.55rem', fontWeight:700, letterSpacing:'.06em',
                         textTransform:'uppercase', padding:'2px 6px', borderRadius:99,
                         background:'var(--c)', color:'var(--ink)' }}>
            ✓
          </span>
        )}
      </div>

      {/* Quality bar */}
      <div style={{ height:3, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:99,
          width:`${Math.round(qualityBar * 100)}%`,
          background: active ? 'var(--c)' : 'var(--border-3)',
          transition:'width var(--t-slow), background var(--t-base)',
        }}/>
      </div>

      {/* Sub-label + estimated size on the same row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
        <span style={{ fontSize:'.66rem', fontWeight:600,
                       color: active ? 'var(--c)' : 'var(--t-tertiary)',
                       transition:'color var(--t-fast)' }}>
          {sublabel}
        </span>

        {estimatedSize != null && (
          <span style={{
            fontSize:'.68rem', fontWeight:700,
            color: active ? 'var(--c)' : 'var(--t-secondary)',
            fontVariantNumeric:'tabular-nums',
            animation:'fade-up .18s ease both',
          }}>
            ~{formatBytes(estimatedSize)}
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize:'.68rem', color:'var(--t-tertiary)', lineHeight:1.5, margin:0 }}>
        {desc}
      </p>
    </button>
  )
}
