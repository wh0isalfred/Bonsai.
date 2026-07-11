/**
 * src/config/presets.js
 *
 * Smart mode compression presets.
 * Each preset maps to a settings object consumed by compression.worker.js.
 *
 * quality:        0–1   WebP/JPEG encode quality
 * maxWidthPx:     cap longest dimension (0 = no resize)
 * stripMetadata:  remove EXIF/ICC data
 * outputFormat:   'webp' | 'jpeg' | 'png' | 'avif' | 'original'
 * mode:           'lossy' | 'lossless'
 * sharpenAmount:  0–5 (unsharp mask strength)
 * blurRadius:     0–10 (pre-encode blur)
 */

export const PRESETS = [
  {
    id:      'extreme',
    label:   'Extreme',
    sublabel:'Max reduction',
    desc:    'Aggressive compression. Best for thumbnails, previews, email.',
    qualityBar: 0.18, // visual only — width of quality indicator bar
    settings: {
      quality:       0.45,
      outputFormat:  'webp',
      mode:          'lossy',
      maxWidthPx:    1600,
      stripMetadata: true,
      sharpenAmount: 0.6,
      blurRadius:    0,
      preventUpscale:true,
      resizeMode:    'maxDimension',
      maxWidth:      1600,
      maxHeight:     1600,
    },
  },
  {
    id:      'high',
    label:   'High',
    sublabel:'Web optimised',
    desc:    'Strong compression with good visual quality. Ideal for web delivery.',
    qualityBar: 0.44,
    settings: {
      quality:       0.68,
      outputFormat:  'webp',
      mode:          'lossy',
      maxWidthPx:    2400,
      stripMetadata: true,
      sharpenAmount: 0.4,
      blurRadius:    0,
      preventUpscale:true,
      resizeMode:    'maxDimension',
      maxWidth:      2400,
      maxHeight:     2400,
    },
  },
  {
    id:      'normal',
    label:   'Normal',
    sublabel:'Balanced',
    desc:    'Good balance of file size and quality. All-purpose compression.',
    qualityBar: 0.68,
    settings: {
      quality:       0.82,
      outputFormat:  'webp',
      mode:          'lossy',
      maxWidthPx:    0,
      stripMetadata: true,
      sharpenAmount: 0.2,
      blurRadius:    0,
      preventUpscale:true,
      resizeMode:    'none',
      maxWidth:      0,
      maxHeight:     0,
    },
  },
  {
    id:      'low',
    label:   'Low',
    sublabel:'Near-lossless',
    desc:    'Minimal reduction. Preserves fine detail, sharp edges, colour accuracy.',
    qualityBar: 0.88,
    settings: {
      quality:       0.93,
      outputFormat:  'original',
      mode:          'lossy',
      maxWidthPx:    0,
      stripMetadata: false,
      sharpenAmount: 0,
      blurRadius:    0,
      preventUpscale:true,
      resizeMode:    'none',
      maxWidth:      0,
      maxHeight:     0,
    },
  },
]

/**
 * Default Pro mode settings — what the editor opens with.
 * Users adjust from here.
 */
export const DEFAULT_PRO_SETTINGS = {
  quality:          0.82,
  outputFormat:     'webp',
  mode:             'lossy',
  resizeMode:       'none',
  maxWidth:         1920,
  maxHeight:        1920,
  exactWidth:       800,
  exactHeight:      600,
  scalePercent:     100,
  blurRadius:       0,
  sharpenAmount:    0,
  stripMetadata:    true,
  preserveAlpha:    true,
  fillColor:        '#ffffff',
  preventUpscale:   true,
  resizeCropMode:   'contain',
  targetSizeKb:     0,       // 0 = no target, >0 = binary-search to hit size
}

export const getPresetById = (id) => PRESETS.find(p => p.id === id) ?? PRESETS[1]

/**
 * Alias — keeps imports consistent across the codebase.
 * ProEditor.jsx imports DEFAULT_ADVANCED.
 */
export const DEFAULT_ADVANCED = DEFAULT_PRO_SETTINGS

/**
 * withPlanWatermark — the ONLY place `watermark` gets set on a settings
 * object before it reaches compression.worker.js.
 *
 * Presets and DEFAULT_PRO_SETTINGS intentionally never carry a `watermark`
 * key themselves — whether a mark gets burned in depends on who's
 * compressing (their plan), not which preset or slider values they chose.
 * Call this exactly once, right before the settings object is handed to
 * the worker, in both SmartCompressor and ProEditor.
 *
 * Free plan → watermarked (the only enforceable free/paid boundary in a
 * 100% client-side product — a batch-size cap or "unlimited" claim is just
 * React state and resets the moment someone reloads; a mark burned into
 * the output pixels doesn't).
 */
export function withPlanWatermark(settings, isPaid) {
  return { ...settings, watermark: !isPaid }
}
