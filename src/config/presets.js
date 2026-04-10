// Each preset maps to concrete compressImage settings.
// estimatedRatio is used to show predicted file size before compression runs.

export const PRESETS = [
  {
    id:          'extreme',
    label:       'Extreme',
    description: 'Saves maximum storage space.',
    estimatedRatio: 0.35,   // ~35% of original
    settings: {
      mode:             'lossy',
      outputFormat:     'webp',
      quality:          0.50,
      resizeMode:       'maxDimension',
      maxDimension:     1280,
      stripMetadata:    true,
      preserveTransparency: true,
      targetSizeKb:     0,
    },
  },
  {
    id:          'high',
    label:       'High',
    description: 'Best for faster online sharing.',
    estimatedRatio: 0.45,
    settings: {
      mode:             'lossy',
      outputFormat:     'webp',
      quality:          0.68,
      resizeMode:       'maxDimension',
      maxDimension:     1920,
      stripMetadata:    true,
      preserveTransparency: true,
      targetSizeKb:     0,
    },
  },
  {
    id:          'normal',
    label:       'Normal',
    description: 'Ideal for general use.',
    estimatedRatio: 0.60,
    settings: {
      mode:             'lossy',
      outputFormat:     'auto',
      quality:          0.82,
      resizeMode:       'maxDimension',
      maxDimension:     2560,
      stripMetadata:    true,
      preserveTransparency: true,
      targetSizeKb:     0,
    },
  },
  {
    id:          'low',
    label:       'Low',
    description: 'Sharp images, smaller file.',
    estimatedRatio: 0.75,
    settings: {
      mode:             'lossy',
      outputFormat:     'auto',
      quality:          0.92,
      resizeMode:       'none',
      maxDimension:     4096,
      stripMetadata:    false,
      preserveTransparency: true,
      targetSizeKb:     0,
    },
  },
]
