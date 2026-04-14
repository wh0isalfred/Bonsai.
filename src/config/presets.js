export const PRESETS = [
  {
    id:          'extreme',
    label:       'Extreme',
    description: 'Maximum size reduction.',
    settings: {
      mode: 'lossy', outputFormat: 'webp', quality: 0.45,
      resizeMode: 'maxDimension', maxWidth: 1280, maxHeight: 1280,
      preventUpscale: true, stripMetadata: true, preserveTransparency: true,
      blurRadius: 0, sharpenAmount: 0, targetSizeKb: 0,
    },
  },
  {
    id:          'high',
    label:       'High',
    description: 'Great for web and sharing.',
    settings: {
      mode: 'lossy', outputFormat: 'webp', quality: 0.65,
      resizeMode: 'maxDimension', maxWidth: 1920, maxHeight: 1920,
      preventUpscale: true, stripMetadata: true, preserveTransparency: true,
      blurRadius: 0, sharpenAmount: 0, targetSizeKb: 0,
    },
  },
  {
    id:          'normal',
    label:       'Normal',
    description: 'Balanced quality and size.',
    settings: {
      mode: 'lossy', outputFormat: 'webp', quality: 0.80,
      resizeMode: 'maxDimension', maxWidth: 2560, maxHeight: 2560,
      preventUpscale: true, stripMetadata: true, preserveTransparency: true,
      blurRadius: 0, sharpenAmount: 0, targetSizeKb: 0,
    },
  },
  {
    id:          'low',
    label:       'Low',
    description: 'Minimal compression, sharp detail.',
    settings: {
      mode: 'lossy', outputFormat: 'webp', quality: 0.88,
      resizeMode: 'none', maxWidth: 4096, maxHeight: 4096,
      preventUpscale: true, stripMetadata: true, preserveTransparency: true,
      blurRadius: 0, sharpenAmount: 0, targetSizeKb: 0,
    },
  },
]

export const DEFAULT_ADVANCED = {
  // Format
  outputFormat:    'webp',   // 'auto'|'webp'|'jpeg'|'png'|'avif'|'original'
  mode:            'lossy',  // 'lossy'|'lossless'
  quality:         0.80,
  targetSizeKb:    0,

  // Resize
  resizeMode:      'none',   // 'none'|'maxDimension'|'exact'|'percentage'
  maxWidth:        1920,
  maxHeight:       1920,
  exactWidth:      1280,
  exactHeight:     720,
  scalePercent:    50,
  resizeCropMode:  'contain', // 'contain'|'cover'
  preventUpscale:  true,
  dpiMode:         'keep',   // 'keep'|'72'|'96'|'150'|'300'

  // Metadata & transparency
  stripMetadata:        true,
  preserveTransparency: true,
  fillColor:            '#ffffff',

  // Post-processing
  blurRadius:    0,
  sharpenAmount: 0,

  // Watermark
  watermarkText:     '',
  watermarkOpacity:  0.4,
  watermarkPosition: 'bottomRight',
  watermarkSize:     16,
}
