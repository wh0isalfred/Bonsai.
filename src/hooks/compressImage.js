const SUPPORTED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif',
])

// ─── Primitives ───────────────────────────────────────────────────────────────

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not load: ${file.name}`)) }
    img.src = url
  })
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')),
      mime,
      quality
    )
  })
}

// ─── Transparency detection ───────────────────────────────────────────────────
// Draws the image onto a tiny 64×64 sample canvas instead of reading the full
// pixel buffer — avoids allocating 48MB on a 4K image just to sample opacity.
function detectTransparency(img) {
  const SIZE   = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, SIZE, SIZE)
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

// ─── Format resolution ────────────────────────────────────────────────────────

function resolveOutputMime(file, settings, hasAlpha) {
  const { outputFormat } = settings
  if (outputFormat && outputFormat !== 'auto') {
    return { jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png' }[outputFormat] ?? 'image/webp'
  }
  // PNG with alpha and lossless mode → keep PNG
  if (hasAlpha && settings.mode === 'lossless') return 'image/png'
  // Everything else → WebP (better compression, supports alpha, universal browser support)
  return 'image/webp'
}

// ─── Dimensions ───────────────────────────────────────────────────────────────

function resolveDimensions(img, settings) {
  const { resizeMode = 'maxDimension', maxDimension = 1920 } = settings
  const ow = img.naturalWidth
  const oh = img.naturalHeight
  if (resizeMode === 'none') return { width: ow, height: oh }
  if (ow <= maxDimension && oh <= maxDimension) return { width: ow, height: oh }
  const ratio = Math.min(maxDimension / ow, maxDimension / oh)
  return { width: Math.round(ow * ratio), height: Math.round(oh * ratio) }
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function drawToCanvas(img, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

// Returns a new canvas with white background composited under the source.
// Used only when outputting JPEG. Never mutates the source canvas.
function flattenToWhite(source) {
  const canvas = document.createElement('canvas')
  canvas.width  = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0)
  return canvas
}

// ─── Binary search for target size or minimum size ────────────────────────────
// Finds the highest quality that keeps blob.size ≤ targetBytes.
// If targetBytes is 0, finds the highest quality that beats originalSize.
async function binarySearchQuality(canvas, mime, targetBytes, startQuality) {
  let lo = 0.05, hi = Math.min(startQuality, 0.99), best = null

  for (let i = 0; i < 10; i++) {
    const mid  = (lo + hi) / 2
    const blob = await canvasToBlob(canvas, mime, mid)
    if (blob.size <= targetBytes) { best = blob; lo = mid }
    else hi = mid
    if (hi - lo < 0.01) break
  }

  // If we never found anything under target, take the smallest we produced
  return best ?? await canvasToBlob(canvas, mime, lo)
}

// ─── EXIF strip ───────────────────────────────────────────────────────────────

async function stripExif(blob) {
  const buf  = await blob.arrayBuffer()
  const view = new DataView(buf)
  if (view.getUint16(0) !== 0xFFD8) return blob
  const parts = [buf.slice(0, 2)]
  let offset  = 2
  while (offset < buf.byteLength - 1) {
    if (view.getUint8(offset) !== 0xFF) { parts.push(buf.slice(offset)); break }
    const marker = view.getUint16(offset)
    if (marker === 0xFFD9) { parts.push(buf.slice(offset, offset + 2)); break }
    if (marker === 0xFFDA) { parts.push(buf.slice(offset)); break }
    if (marker >= 0xFFD0 && marker <= 0xFFD7) { parts.push(buf.slice(offset, offset + 2)); offset += 2; continue }
    if (offset + 4 > buf.byteLength) break
    const len = view.getUint16(offset + 2) + 2
    if (marker !== 0xFFE1) parts.push(buf.slice(offset, offset + len))
    offset += len
  }
  return new Blob(parts, { type: 'image/jpeg' })
}

// ─── Core encode ──────────────────────────────────────────────────────────────
// Shared by both compressImage and previewAllPresets.
// Takes a pre-decoded img + settings, returns { blob, outputMime }.
async function encode(img, file, settings, hasAlpha) {
  const { width, height } = resolveDimensions(img, settings)
  const outputMime        = resolveOutputMime(file, settings, hasAlpha)
  const sourceCanvas      = drawToCanvas(img, width, height)
  const encodeCanvas      = outputMime === 'image/jpeg' ? flattenToWhite(sourceCanvas) : sourceCanvas
  const quality           = outputMime === 'image/png' ? undefined : (settings.quality ?? 0.80)

  let blob

  if (settings.targetSizeKb > 0 && outputMime !== 'image/png') {
    blob = await binarySearchQuality(encodeCanvas, outputMime, settings.targetSizeKb * 1024, quality)
  } else {
    blob = await canvasToBlob(encodeCanvas, outputMime, quality)
  }

  // Guarantee output is smaller than original for lossy modes
  if (blob.size >= file.size && outputMime !== 'image/png' && settings.mode !== 'lossless') {
    blob = await binarySearchQuality(encodeCanvas, outputMime, file.size - 1, quality)
  }

  return { blob, outputMime, width, height }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function compressImage(file, settings = {}, onProgress) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error(`Unsupported format: ${file.type || 'unknown'}`)
  }

  onProgress?.(5)
  const img      = await loadImage(file)
  const hasAlpha = detectTransparency(img)
  onProgress?.(20)

  const { blob, outputMime, width, height } = await encode(img, file, settings, hasAlpha)
  onProgress?.(80)

  const finalBlob = settings.stripMetadata && outputMime === 'image/jpeg'
    ? await stripExif(blob)
    : blob

  onProgress?.(100)

  const ext      = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[outputMime] ?? 'webp'
  const baseName = file.name.replace(/\.[^/.]+$/, '')

  return {
    blob:           finalBlob,
    name:           `${baseName}_bonsai.${ext}`,
    originalSize:   file.size,
    compressedSize: finalBlob.size,
    width,
    height,
    outputMime,
    url: URL.createObjectURL(finalBlob),
  }
}

export function validateFile(file) {
  if (!SUPPORTED_TYPES.has(file.type)) return { valid: false, reason: `${file.type || 'Unknown'} not supported` }
  if (file.size > 50 * 1024 * 1024)   return { valid: false, reason: 'Exceeds 50 MB limit' }
  return { valid: true }
}

// ─── Preview: decode once, fork into N parallel encodes ───────────────────────
// Detects transparency once on a tiny sample, reuses result for all presets.
// Returns { presetId → compressedSize }.
export async function previewAllPresets(file, presets) {
  if (!SUPPORTED_TYPES.has(file.type)) return {}

  try {
    const img      = await loadImage(file)
    const hasAlpha = detectTransparency(img) // detect ONCE, reuse across all presets

    const results = await Promise.all(
      presets.map(async (p) => {
        try {
          const { blob } = await encode(img, file, p.settings, hasAlpha)
          return { id: p.id, size: blob.size }
        } catch {
          return { id: p.id, size: null }
        }
      })
    )

    return Object.fromEntries(results.map(r => [r.id, r.size]))
  } catch {
    return {}
  }
}
