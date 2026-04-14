import { useState } from 'react'
import { PRESETS } from '../config/presets'
import { formatBytes } from '../hooks/formatBytes'
import { validateFormatSettings } from '../hooks/compressImage'

export default function SettingsPanel({
  preset, onSelect, previews = {},
  useAdvanced, advancedSettings, onAdvancedChange, onResetAdvanced,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      {/* Preset cards */}
      <div className="flex flex-col gap-2">
        {PRESETS.map(p => {
          const active  = !useAdvanced && preset === p.id
          const preview = previews[p.id]
          const loading = preview?.loading ?? false
          const size    = preview?.size    ?? null
          const isAdv   = preview?.isAdvanced ?? false

          return (
            <button key={p.id} onClick={() => onSelect(p.id)}
              className="w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-150 focus:outline-none"
              style={{
                border: active ? '1.5px solid #4CAF50' : '1.5px solid #E8E4DC',
                background: active
                  ? 'linear-gradient(135deg, rgba(31,61,43,0.06) 0%, rgba(76,175,80,0.06) 100%)'
                  : '#fff',
              }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: active ? '#1F3D2B' : '#2A2A2A' }}>
                      {p.label}
                    </p>
                    {loading ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                        style={{ background: active ? 'rgba(31,61,43,0.08)' : '#F5F1E8', color: active ? '#1F3D2B' : '#6B4F3A' }}>
                        <SpinnerIcon /> Calculating…
                      </span>
                    ) : size !== null ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                        style={{ background: active ? '#1F3D2B' : '#F5F1E8', color: active ? '#F5F1E8' : '#6B4F3A' }}>
                        {formatBytes(size)}{isAdv ? ' †' : ''}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: active ? '#4CAF50' : '#6B4F3A' }}>{p.description}</p>
                </div>
                {/* Radio */}
                <div className="w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    width: 18, height: 18,
                    border: active ? '2px solid #4CAF50' : '2px solid #D9D9D9',
                    background: active ? '#4CAF50' : '#fff',
                  }}>
                  {active && <div className="w-2 h-2 rounded-full" style={{ background: '#fff' }} />}
                </div>
              </div>
            </button>
          )
        })}
        {previews[PRESETS[0].id]?.isAdvanced && (
          <p className="text-[10px] px-1" style={{ color: '#6B4F3A' }}>† Showing size for your advanced settings</p>
        )}
      </div>

      {/* Advanced toggle */}
      <button onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-2 px-1 text-xs transition-colors"
        style={{ color: '#6B4F3A' }}>
        <span className="transition-transform duration-200 inline-block text-[10px]"
          style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        Advanced options
        {useAdvanced && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(31,61,43,0.1)', color: '#1F3D2B' }}>
            active
          </span>
        )}
      </button>

      {showAdvanced && (
        <AdvancedPanel settings={advancedSettings} onChange={onAdvancedChange} onReset={onResetAdvanced} />
      )}
    </div>
  )
}

function AdvancedPanel({ settings: s, onChange, onReset }) {
  const isLossless    = s.mode === 'lossless'
  const formatWarning = validateFormatSettings(s.outputFormat, s.quality, s.mode)

  return (
    <div className="rounded-2xl overflow-hidden text-xs"
      style={{ background: '#fff', border: '1px solid #E8E4DC' }}>

      <Section label="Compression">
        <Row label="Mode">
          <Seg value={s.mode} onChange={v => onChange({ mode: v })} options={[
            { value: 'lossy', label: 'Lossy' }, { value: 'lossless', label: 'Lossless' },
          ]} />
        </Row>
        {isLossless && (
          <InfoBox>Lossless: WebP encodes at full fidelity. PNG is bit-perfect. Files will be larger than lossy.</InfoBox>
        )}
        <Row label="Output format">
          <div className="flex flex-col gap-1.5">
            <select value={s.outputFormat} onChange={e => onChange({ outputFormat: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
              style={{ border: '1px solid #D9D9D9', color: '#2A2A2A', background: '#fff', fontFamily: 'inherit' }}>
              <option value="auto">Auto (recommended)</option>
              <option value="webp">WebP — best compression</option>
              <option value="jpeg">JPEG — universal, no alpha</option>
              <option value="png">PNG — lossless, large files</option>
              <option value="avif">AVIF — best ratio, newer browsers</option>
              <option value="original">Keep original format</option>
            </select>
            {formatWarning && <WarnBox>{formatWarning}</WarnBox>}
          </div>
        </Row>
        {!isLossless && (
          <Row label={`Quality — ${Math.round(s.quality * 100)}%`}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input type="range" min={5} max={100} step={1}
                  value={Math.round(s.quality * 100)}
                  onChange={e => onChange({ quality: Number(e.target.value) / 100 })}
                  className="flex-1" style={{ accentColor: '#1F3D2B' }} />
                <div className="flex gap-0.5 flex-shrink-0">
                  {[[45,'XS'],[65,'S'],[80,'M'],[90,'L'],[95,'XL']].map(([v,l]) => (
                    <button key={v} onClick={() => onChange({ quality: v/100 })}
                      className="text-[9px] px-1.5 py-0.5 rounded-lg transition-all"
                      style={{
                        background: Math.round(s.quality*100) === v ? '#1F3D2B' : '#F5F1E8',
                        color:      Math.round(s.quality*100) === v ? '#F5F1E8' : '#6B4F3A',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-[9px] px-0.5" style={{ color: '#D9D9D9' }}>
                <span>Smallest</span><span>Highest quality</span>
              </div>
            </div>
          </Row>
        )}
        <Row label="Target size (KB)">
          <input type="number" min={0} max={50000} step={10} value={s.targetSizeKb || ''}
            placeholder="0 = disabled"
            onChange={e => onChange({ targetSizeKb: Number(e.target.value) || 0 })}
            className="w-full px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
            style={{ border: '1px solid #D9D9D9', color: '#2A2A2A', fontFamily: 'inherit' }} />
        </Row>
      </Section>

      <Div />

      <Section label="Resize">
        <Row label="Mode">
          <Seg value={s.resizeMode} onChange={v => onChange({ resizeMode: v })} options={[
            { value: 'none', label: 'None' }, { value: 'maxDimension', label: 'Max' },
            { value: 'exact', label: 'Exact' }, { value: 'percentage', label: '%' },
          ]} />
        </Row>
        {s.resizeMode === 'maxDimension' && <>
          <Row label={`Max W — ${s.maxWidth}px`}>
            <input type="range" min={64} max={4096} step={64} value={s.maxWidth}
              onChange={e => onChange({ maxWidth: Number(e.target.value) })}
              className="w-full" style={{ accentColor: '#1F3D2B' }} />
          </Row>
          <Row label={`Max H — ${s.maxHeight}px`}>
            <input type="range" min={64} max={4096} step={64} value={s.maxHeight}
              onChange={e => onChange({ maxHeight: Number(e.target.value) })}
              className="w-full" style={{ accentColor: '#1F3D2B' }} />
          </Row>
        </>}
        {s.resizeMode === 'exact' && <>
          <Row label="Fit mode">
            <Seg value={s.resizeCropMode} onChange={v => onChange({ resizeCropMode: v })} options={[
              { value: 'contain', label: 'Fit' }, { value: 'cover', label: 'Crop' },
            ]} />
          </Row>
          <Row label="W × H (px)">
            <div className="flex items-center gap-2">
              <NumInput value={s.exactWidth}  onChange={v => onChange({ exactWidth: v  })} />
              <span style={{ color: '#D9D9D9' }}>×</span>
              <NumInput value={s.exactHeight} onChange={v => onChange({ exactHeight: v })} />
            </div>
          </Row>
        </>}
        {s.resizeMode === 'percentage' && (
          <Row label={`Scale — ${s.scalePercent}%`}>
            <input type="range" min={5} max={200} step={5} value={s.scalePercent}
              onChange={e => onChange({ scalePercent: Number(e.target.value) })}
              className="w-full" style={{ accentColor: '#1F3D2B' }} />
          </Row>
        )}
        <Row label="DPI">
          <select value={s.dpiMode} onChange={e => onChange({ dpiMode: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
            style={{ border: '1px solid #D9D9D9', color: '#2A2A2A', background: '#fff', fontFamily: 'inherit' }}>
            <option value="keep">Keep original</option>
            <option value="72">72 dpi — screen / web</option>
            <option value="96">96 dpi — standard screen</option>
            <option value="150">150 dpi — medium print</option>
            <option value="300">300 dpi — high print</option>
          </select>
        </Row>
        <Row label="Prevent upscale"><Toggle checked={s.preventUpscale} onChange={v => onChange({ preventUpscale: v })} /></Row>
      </Section>

      <Div />

      <Section label="Metadata & transparency">
        <Row label="Strip EXIF"><Toggle checked={s.stripMetadata} onChange={v => onChange({ stripMetadata: v })} /></Row>
        <Row label="Preserve alpha"><Toggle checked={s.preserveTransparency} onChange={v => onChange({ preserveTransparency: v })} /></Row>
        <Row label="Background fill">
          <div className="flex items-center gap-2">
            <input type="color" value={s.fillColor} onChange={e => onChange({ fillColor: e.target.value })}
              className="w-8 h-7 rounded-lg cursor-pointer p-0.5 flex-shrink-0"
              style={{ border: '1px solid #D9D9D9' }} />
            <span className="font-mono text-[10px]" style={{ color: '#6B4F3A' }}>{s.fillColor}</span>
            <span className="text-[10px]" style={{ color: '#D9D9D9' }}>for JPEG output</span>
          </div>
        </Row>
      </Section>

      <Div />

      <Section label="Post-processing">
        <Row label={`Blur — ${s.blurRadius}px`}>
          <input type="range" min={0} max={20} step={0.5} value={s.blurRadius}
            onChange={e => onChange({ blurRadius: Number(e.target.value) })}
            className="w-full" style={{ accentColor: '#1F3D2B' }} />
        </Row>
        <Row label={`Sharpen — ${s.sharpenAmount}`}>
          <input type="range" min={0} max={5} step={0.1} value={s.sharpenAmount}
            onChange={e => onChange({ sharpenAmount: Number(e.target.value) })}
            className="w-full" style={{ accentColor: '#1F3D2B' }} />
        </Row>
      </Section>

      <Div />

      <Section label="Watermark">
        <Row label="Text">
          <input type="text" value={s.watermarkText || ''} placeholder="© Your Name 2025"
            onChange={e => onChange({ watermarkText: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
            style={{ border: '1px solid #D9D9D9', color: '#2A2A2A', fontFamily: 'inherit' }} />
        </Row>
        {s.watermarkText?.trim() && <>
          <Row label="Position">
            <select value={s.watermarkPosition} onChange={e => onChange({ watermarkPosition: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs focus:outline-none"
              style={{ border: '1px solid #D9D9D9', color: '#2A2A2A', background: '#fff', fontFamily: 'inherit' }}>
              <option value="bottomRight">Bottom right</option>
              <option value="bottomLeft">Bottom left</option>
              <option value="topRight">Top right</option>
              <option value="topLeft">Top left</option>
              <option value="center">Center</option>
            </select>
          </Row>
          <Row label={`Opacity — ${Math.round(s.watermarkOpacity*100)}%`}>
            <input type="range" min={5} max={100} step={5} value={Math.round(s.watermarkOpacity*100)}
              onChange={e => onChange({ watermarkOpacity: Number(e.target.value)/100 })}
              className="w-full" style={{ accentColor: '#1F3D2B' }} />
          </Row>
          <Row label={`Size — ${s.watermarkSize}px`}>
            <input type="range" min={10} max={120} step={2} value={s.watermarkSize}
              onChange={e => onChange({ watermarkSize: Number(e.target.value) })}
              className="w-full" style={{ accentColor: '#1F3D2B' }} />
          </Row>
        </>}
      </Section>

      <div className="px-4 py-3 flex justify-end" style={{ borderTop: '1px solid #F5F1E8' }}>
        <button onClick={onReset} className="text-[11px] transition-colors" style={{ color: '#6B4F3A' }}>
          Reset to defaults
        </button>
      </div>
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────

const Section = ({ label, children }) => (
  <div className="px-4 py-3.5">
    <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6B4F3A' }}>{label}</p>
    <div className="flex flex-col gap-2.5">{children}</div>
  </div>
)

const Div = () => <div style={{ height: 1, background: '#F5F1E8' }} />

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-[11px] flex-shrink-0 pt-0.5" style={{ color: '#6B4F3A', minWidth: 110 }}>{label}</span>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
)

const InfoBox = ({ children }) => (
  <div className="px-3 py-2 rounded-xl text-[11px] leading-relaxed"
    style={{ background: 'rgba(31,61,43,0.06)', color: '#1F3D2B', border: '1px solid rgba(31,61,43,0.1)' }}>
    {children}
  </div>
)

const WarnBox = ({ children }) => (
  <div className="flex gap-1.5 px-3 py-2 rounded-xl text-[11px] leading-relaxed"
    style={{ background: 'rgba(107,79,58,0.08)', color: '#6B4F3A', border: '1px solid rgba(107,79,58,0.15)' }}>
    <span className="flex-shrink-0">⚠</span><span>{children}</span>
  </div>
)

function Seg({ value, onChange, options }) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: '#F5F1E8', border: '1px solid #E8E4DC' }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className="flex-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all"
          style={{
            background: value === opt.value ? '#1F3D2B' : 'transparent',
            color:      value === opt.value ? '#F5F1E8'  : '#6B4F3A',
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
      style={{ width: 36, height: 22, background: checked ? '#1F3D2B' : '#D9D9D9' }}>
      <span aria-hidden="true" className="absolute top-[2px] rounded-full transition-all duration-200"
        style={{ width: 18, height: 18, background: '#fff', left: checked ? 16 : 2 }} />
    </button>
  )
}

function NumInput({ value, onChange }) {
  return (
    <input type="number" min={1} max={8192} value={value}
      onChange={e => onChange(Math.max(1, Number(e.target.value)))}
      className="w-20 px-2 py-1 rounded-lg text-xs focus:outline-none"
      style={{ border: '1px solid #D9D9D9', color: '#2A2A2A', fontFamily: 'inherit' }} />
  )
}

function SpinnerIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ animation: 'bonsai-spin 0.75s linear infinite' }}>
      <style>{`@keyframes bonsai-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <path d="M5 1 A4 4 0 0 1 9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
