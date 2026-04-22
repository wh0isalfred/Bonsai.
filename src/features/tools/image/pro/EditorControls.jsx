/**
 * src/features/tools/image/pro/EditorControls.jsx
 *
 * Stateless sidebar controls for the Pro editor.
 * Props: settings object + onChange(patch) callback.
 */
import { DEFAULT_PRO_SETTINGS } from '../../../../config/presets'

const FORMATS = [
  { id:'webp',     label:'WebP' },
  { id:'avif',     label:'AVIF' },
  { id:'jpeg',     label:'JPEG' },
  { id:'png',      label:'PNG' },
  { id:'original', label:'Original' },
]
const RESIZE_MODES = [
  { id:'none',         label:'None' },
  { id:'maxDimension', label:'Max px' },
  { id:'exact',        label:'Exact' },
  { id:'percentage',   label:'Scale %' },
]

function fmtBytes(b) {
  if (!b) return null
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b/1024).toFixed(0)} KB`
  return `${(b/1024/1024).toFixed(1)} MB`
}

export default function EditorControls({ settings, onChange, estimatedSize }) {
  const s   = settings ?? DEFAULT_PRO_SETTINGS
  const set = patch => onChange(patch)
  const q   = Math.round((s.quality ?? 0.82) * 100)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Quality */}
      <Section
        label="Quality"
        value={`${q}%`}
        hint={estimatedSize ? `~${fmtBytes(estimatedSize)}` : null}>
        <Slider
          value={q} min={1} max={100} step={1}
          fill={q / 100}
          onChange={v => set({ quality: v / 100 })} />
      </Section>

      {/* Format */}
      <Section label="Output format">
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {FORMATS.map(f => (
            <Chip
              key={f.id}
              label={f.label}
              active={s.outputFormat === f.id}
              onClick={() => set({ outputFormat: f.id })} />
          ))}
        </div>
      </Section>

      {/* Mode */}
      <Section label="Encoding">
        <div style={{ display:'flex', gap:6 }}>
          <Chip label="Lossy"     active={s.mode === 'lossy'}    onClick={() => set({ mode:'lossy' })} />
          <Chip label="Lossless"  active={s.mode === 'lossless'} onClick={() => set({ mode:'lossless' })} />
        </div>
      </Section>

      {/* Blur */}
      <Section label="Blur" value={(s.blurRadius ?? 0).toFixed(1)}>
        <Slider
          value={s.blurRadius ?? 0} min={0} max={10} step={0.1}
          fill={(s.blurRadius ?? 0) / 10}
          onChange={v => set({ blurRadius: v })} />
      </Section>

      {/* Sharpen */}
      <Section label="Sharpen" value={(s.sharpenAmount ?? 0).toFixed(1)}>
        <Slider
          value={s.sharpenAmount ?? 0} min={0} max={5} step={0.1}
          fill={(s.sharpenAmount ?? 0) / 5}
          onChange={v => set({ sharpenAmount: v })} />
      </Section>

      {/* Resize */}
      <Section label="Resize">
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
          {RESIZE_MODES.map(r => (
            <Chip
              key={r.id}
              label={r.label}
              active={s.resizeMode === r.id}
              onClick={() => set({ resizeMode: r.id })} />
          ))}
        </div>
        {s.resizeMode === 'maxDimension' && (
          <div style={{ display:'flex', gap:8 }}>
            <NumberField label="Max W" value={s.maxWidth}  onChange={v => set({ maxWidth: v })} />
            <NumberField label="Max H" value={s.maxHeight} onChange={v => set({ maxHeight: v })} />
          </div>
        )}
        {s.resizeMode === 'exact' && (
          <div style={{ display:'flex', gap:8 }}>
            <NumberField label="Width"  value={s.exactWidth}  onChange={v => set({ exactWidth: v })} />
            <NumberField label="Height" value={s.exactHeight} onChange={v => set({ exactHeight: v })} />
          </div>
        )}
        {s.resizeMode === 'percentage' && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Slider
              value={s.scalePercent ?? 100} min={5} max={200} step={1}
              fill={Math.min((s.scalePercent ?? 100) / 200, 1)}
              onChange={v => set({ scalePercent: v })} />
            <span style={{ fontSize:'.75rem', color:'var(--t-secondary)',
                           minWidth:34, textAlign:'right' }}>
              {s.scalePercent ?? 100}%
            </span>
          </div>
        )}
      </Section>

      {/* Metadata */}
      <Section label="Metadata">
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          <Toggle
            label="Strip EXIF data"
            checked={s.stripMetadata ?? true}
            onChange={v => set({ stripMetadata: v })} />
          <Toggle
            label="Preserve transparency"
            checked={s.preserveAlpha ?? true}
            onChange={v => set({ preserveAlpha: v })} />
        </div>
      </Section>

      {/* Reset */}
      <button
        onClick={() => onChange({ ...DEFAULT_PRO_SETTINGS })}
        className="btn btn-ghost btn-sm btn-block"
        style={{ marginTop:4 }}>
        Reset to defaults
      </button>

    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────── */
function Section({ label, value, hint, children }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <p style={{ fontSize:'.6rem', fontWeight:700, letterSpacing:'.1em',
                    textTransform:'uppercase', color:'var(--c)', margin:0, flex:1 }}>
          {label}
        </p>
        {value != null && (
          <span style={{ fontSize:'.7rem', fontWeight:600, color:'var(--t-secondary)',
                         fontVariantNumeric:'tabular-nums' }}>
            {value}
          </span>
        )}
        {hint && (
          <span style={{ fontSize:'.65rem', color:'var(--t-tertiary)' }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Slider({ value, min, max, step, fill, onChange }) {
  /* Dynamic fill gradient for the track */
  const pct = `${Math.round(fill * 100)}%`
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width:  '100%',
        cursor: 'pointer',
        /* fill left side with celadon, right with border colour */
        background: `linear-gradient(to right,
          var(--c) 0%, var(--c) ${pct},
          var(--border-2) ${pct}, var(--border-2) 100%)`,
        borderRadius: 99,
        height: 4,
        WebkitAppearance: 'none',
        appearance: 'none',
        outline: 'none',
        border: 'none',
      }} />
  )
}

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      '4px 11px',
        borderRadius: 'var(--r-full)',
        border:       `1px solid ${active ? 'var(--c-border)' : 'var(--border-2)'}`,
        background:   active ? 'var(--c-bg)' : 'transparent',
        color:        active ? 'var(--c)' : 'var(--t-secondary)',
        fontFamily:   'var(--font-ui)',
        fontSize:     '.7rem',
        fontWeight:   600,
        cursor:       'pointer',
        transition:   'all var(--t-fast)',
        lineHeight:   1,
      }}>
      {label}
    </button>
  )
}

function NumberField({ label, value, onChange }) {
  return (
    <div style={{ flex:1 }}>
      <label style={{ display:'block', fontSize:'.62rem', color:'var(--t-tertiary)',
                      marginBottom:3, fontWeight:500 }}>
        {label}
      </label>
      <input
        type="number" value={value} min={1}
        onChange={e => onChange(Number(e.target.value))}
        className="input"
        style={{ fontSize:'.8rem', padding:'5px 8px' }} />
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center',
                    justifyContent:'space-between', cursor:'pointer' }}>
      <span style={{ fontSize:'.76rem', color:'var(--t-secondary)' }}>{label}</span>
      <label className="toggle" style={{ cursor:'pointer' }}>
        <input type="checkbox" checked={checked}
          onChange={e => onChange(e.target.checked)} />
        <div className="toggle-track">
          <div className="toggle-thumb" />
        </div>
      </label>
    </label>
  )
}
