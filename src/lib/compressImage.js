const SUPPORTED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif',
])

export const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png':  'png',
  'image/avif': 'avif',
}

// ─── Format compatibility ─────────────────────────────────────────────────────
export const FORMAT_COMPAT = {
  jpeg:     { minQuality: 0,    losslessOk: false },
  webp:     { minQuality: 0,    losslessOk: true  },
  png:      { minQuality: 0,    losslessOk: true  },
  avif:     { minQuality: 0,    losslessOk: false },
  auto:     { minQuality: 0,    losslessOk: true  },
  original: { minQuality: 0,    losslessOk: true  },
}

export function validateFormatSettings(outputFormat, quality, mode) {
  if (mode === 'lossless' && (outputFormat === 'jpeg' || outputFormat === 'avif')) {
    return 'JPEG and AVIF do not support lossless encoding. Switch to WebP, PNG, or Auto.'
  }
  if (outputFormat === 'png' && mode === 'lossy') {
    return 'PNG is always lossless — the quality slider has no effect. Switch to WebP or JPEG for smaller files.'
  }
  return null
}

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
function detectTransparency(img) {
  const S = 64
  const c = document.createElement('canvas')
  c.width = c.height = S
  c.getContext('2d').drawImage(img, 0, 0, S, S)
  const d = c.getContext('2d').getImageData(0, 0, S, S).data
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true
  return false
}

// ─── Browser format support ───────────────────────────────────────────────────
const _fmtCache = {}
async function browserSupports(mime) {
  if (_fmtCache[mime] !== undefined) return _fmtCache[mime]
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 4
    const blob = await canvasToBlob(c, mime, 0.5)
    _fmtCache[mime] = !!(blob && blob.size > 0 && blob.type === mime)
  } catch { _fmtCache[mime] = false }
  return _fmtCache[mime]
}

// ─── Resolve output MIME ──────────────────────────────────────────────────────
async function resolveOutputMime(fileType, outputFormat, mode, hasAlpha) {
  switch (outputFormat) {
    case 'jpeg':     return 'image/jpeg'
    case 'png':      return 'image/png'
    case 'webp':     return 'image/webp'
    case 'original': return fileType === 'image/jpg' ? 'image/jpeg' : (fileType || 'image/jpeg')
    case 'avif': {
      const ok = await browserSupports('image/avif')
      return ok ? 'image/avif' : 'image/webp'
    }
  }
  // auto
  if (mode === 'lossless') return hasAlpha ? 'image/png' : 'image/webp'
  return 'image/webp'
}

// ─── Resolve quality ──────────────────────────────────────────────────────────
// LOSSLESS STRATEGY:
// - PNG:  quality is irrelevant — PNG is always lossless by spec. Pass undefined.
// - WebP: quality=1.0 triggers WebP's lossless encoder in the Canvas API.
// - JPEG: no true lossless, so we use near-lossless (0.97) — best possible without
//         format change. This is better than WebP-lossless which would be bigger.
// - AVIF: no lossless via Canvas, so we use 0.95 as near-lossless equivalent.
//
// LOSSY: use the quality setting directly.
function resolveQuality(outputMime, mode, qualitySetting) {
  if (outputMime === 'image/png') return undefined  // PNG ignores quality

  if (mode === 'lossless') {
    if (outputMime === 'image/webp')  return 1.0   // triggers WebP lossless encoder
    if (outputMime === 'image/jpeg')  return 0.97  // near-lossless, no format change
    if (outputMime === 'image/avif')  return 0.95  // best achievable with Canvas AVIF
    return 1.0
  }

  return qualitySetting ?? 0.80
}

// ─── Dimensions ───────────────────────────────────────────────────────────────
function resolveDimensions(img, settings) {
  const {
    resizeMode     = 'none',
    maxWidth       = 1920,
    maxHeight      = 1920,
    exactWidth     = 800,
    exactHeight    = 600,
    scalePercent   = 100,
    preventUpscale = true,
    dpiMode        = 'keep',
  } = settings

  let ow = img.naturalWidth
  let oh = img.naturalHeight

  if (dpiMode !== 'keep') {
    const dpiRatio = Number(dpiMode) / 300
    ow = Math.max(1, Math.round(ow * dpiRatio))
    oh = Math.max(1, Math.round(oh * dpiRatio))
  }

  let w = ow, h = oh

  if (resizeMode === 'maxDimension') {
    const mw = maxWidth || 1920, mh = maxHeight || 1920
    if (w > mw || h > mh) {
      const r = Math.min(mw / w, mh / h)
      w = Math.round(w * r); h = Math.round(h * r)
    }
  } else if (resizeMode === 'exact') {
    w = exactWidth || 800; h = exactHeight || 600
  } else if (resizeMode === 'percentage') {
    const f = Math.max(1, scalePercent) / 100
    w = Math.round(ow * f); h = Math.round(oh * f)
  }

  if (preventUpscale) {
    if (w > img.naturalWidth)  w = img.naturalWidth
    if (h > img.naturalHeight) h = img.naturalHeight
  }

  return { width: Math.max(1, w), height: Math.max(1, h) }
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function drawContain(img, w, h) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  return c
}

function drawCover(img, w, h) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale, sh = h / scale
  const sx = (img.naturalWidth  - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  return c
}

function flattenOntoBackground(source, fillColor = '#ffffff') {
  const c = makeCanvas(source.width, source.height), ctx = c.getContext('2d')
  ctx.fillStyle = fillColor
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(source, 0, 0)
  return c
}

function applyBlur(canvas, radius) {
  if (!radius || radius <= 0) return canvas
  const pad  = Math.ceil(radius * 2)
  const big  = makeCanvas(canvas.width + pad * 2, canvas.height + pad * 2)
  const bctx = big.getContext('2d')
  bctx.drawImage(canvas, pad, pad)
  bctx.filter = `blur(${radius}px)`
  const out  = makeCanvas(canvas.width, canvas.height)
  const octx = out.getContext('2d')
  octx.drawImage(big, -pad, -pad)
  return out
}

function applySharpen(canvas, amount) {
  if (!amount || amount <= 0) return canvas
  const w = canvas.width, h = canvas.height
  const src  = canvas.getContext('2d').getImageData(0, 0, w, h)
  const out  = makeCanvas(w, h), ctx = out.getContext('2d')
  const blurC = applyBlur(canvas, 1.5)
  const blurD = blurC.getContext('2d').getImageData(0, 0, w, h)
  const result = ctx.createImageData(w, h)
  const factor = amount * 1.5
  for (let i = 0; i < src.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const idx = i + c
      result.data[idx] = Math.min(255, Math.max(0,
        src.data[idx] + factor * (src.data[idx] - blurD.data[idx])
      ))
    }
    result.data[i + 3] = src.data[i + 3]
  }
  ctx.putImageData(result, 0, 0)
  return out
}

// ─── Bonsai brand watermark ───────────────────────────────────────────────────
// Fixed brand mark — always bottom-right, semi-transparent, professional.
// Not user-configurable. Size scales with image dimensions.
function applyBonsaiWatermark(canvas) {
  const ctx = canvas.getContext('2d')

  // Scale font size relative to image width: 1.2% of width, min 11px, max 22px
  const fontSize = Math.max(11, Math.min(22, Math.round(canvas.width * 0.012)))
  const pad = Math.max(10, Math.round(canvas.width * 0.018))

  ctx.save()
  ctx.globalAlpha   = 0.18           // very subtle — professional, not intrusive
  ctx.font          = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.letterSpacing = '0.04em'
  ctx.fillStyle     = '#ffffff'
  ctx.shadowColor   = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur    = 3
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1

  const text = 'Bonsai'
  const tw   = ctx.measureText(text).width
  const x    = canvas.width  - tw - pad
  const y    = canvas.height - pad

  ctx.fillText(text, x, y)
  ctx.restore()
  return canvas
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

// ─── Binary search quality ────────────────────────────────────────────────────
async function binarySearchQuality(canvas, mime, targetBytes, startQuality) {
  if (mime === 'image/png') return canvasToBlob(canvas, mime)
  let lo = 0.05, hi = Math.min(startQuality, 0.99), best = null
  for (let i = 0; i < 12; i++) {
    const mid  = (lo + hi) / 2
    const blob = await canvasToBlob(canvas, mime, mid)
    if (blob.size <= targetBytes) { best = blob; lo = mid }
    else hi = mid
    if (hi - lo < 0.008) break
  }
  return best ?? await canvasToBlob(canvas, mime, 0.05)
}

// ─── Core encode ─────────────────────────────────────────────────────────────
export async function encode(img, file, settings, hasAlpha) {
  const {
    mode           = 'lossy',
    outputFormat   = 'auto',
    quality        = 0.80,
    resizeCropMode = 'contain',
    blurRadius     = 0,
    sharpenAmount  = 0,
    fillColor      = '#ffffff',
    stripMetadata  = true,
    targetSizeKb   = 0,
  } = settings

  const { width, height } = resolveDimensions(img, settings)
  const outputMime        = await resolveOutputMime(file.type, outputFormat, mode, hasAlpha)
  const resolvedQuality   = resolveQuality(outputMime, mode, quality)

  // Build canvas
  let canvas = resizeCropMode === 'cover'
    ? drawCover(img, width, height)
    : drawContain(img, width, height)

  if (blurRadius    > 0) canvas = applyBlur(canvas, blurRadius)
  if (sharpenAmount > 0) canvas = applySharpen(canvas, sharpenAmount)

  // Always apply Bonsai brand watermark
  canvas = applyBonsaiWatermark(canvas)

  // JPEG must flatten alpha
  const encodeCanvas = outputMime === 'image/jpeg'
    ? flattenOntoBackground(canvas, fillColor)
    : canvas

  // Encode
  let blob
  if (targetSizeKb > 0 && outputMime !== 'image/png') {
    blob = await binarySearchQuality(encodeCanvas, outputMime, targetSizeKb * 1024, resolvedQuality ?? 0.80)
  } else {
    blob = await canvasToBlob(encodeCanvas, outputMime, resolvedQuality)
  }

  // Guarantee smaller than original for lossy only (never for lossless — it's intentional)
  if (
    targetSizeKb === 0 &&
    mode !== 'lossless' &&
    outputMime !== 'image/png' &&
    blob.size >= file.size
  ) {
    blob = await binarySearchQuality(encodeCanvas, outputMime, file.size - 1, resolvedQuality ?? 0.80)
  }

  if (stripMetadata && outputMime === 'image/jpeg') {
    blob = await stripExif(blob)
  }

  return { blob, outputMime, width, height }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function compressImage(file, settings = {}, onProgress) {
  if (!SUPPORTED_TYPES.has(file.type)) throw new Error(`Unsupported: ${file.type || 'unknown'}`)

  onProgress?.(5)
  const img      = await loadImage(file)
  const hasAlpha = detectTransparency(img)
  onProgress?.(20)

  const { blob, outputMime, width, height } = await encode(img, file, settings, hasAlpha)
  onProgress?.(100)

  const ext      = MIME_TO_EXT[outputMime] ?? 'webp'
  const baseName = (settings.outputName?.trim() || file.name).replace(/\.[^/.]+$/, '')

  return {
    blob,
    name:           `${baseName}.${ext}`,
    originalSize:   file.size,
    compressedSize: blob.size,
    originalWidth:  img.naturalWidth,
    originalHeight: img.naturalHeight,
    width,
    height,
    outputMime,
    hasAlpha,
    url: URL.createObjectURL(blob),
  }
}

export function validateFile(file) {
  if (!SUPPORTED_TYPES.has(file.type)) return { valid: false, reason: `${file.type || 'Unknown'} not supported` }
  if (file.size > 100 * 1024 * 1024)  return { valid: false, reason: 'Exceeds 100 MB limit' }
  return { valid: true }
}

// Always uses each preset's own settings — never polluted by advanced state
export async function previewAllPresets(file, presets) {
  if (!SUPPORTED_TYPES.has(file.type)) return {}
  try {
    const img      = await loadImage(file)
    const hasAlpha = detectTransparency(img)
    const results  = await Promise.all(
      presets.map(async (p) => {
        try {
          const { blob } = await encode(img, file, p.settings, hasAlpha)
          return { id: p.id, size: blob.size }
        } catch { return { id: p.id, size: null } }
      })
    )
    return Object.fromEntries(results.map(r => [r.id, r.size]))
  } catch { return {} }
}

export async function getImageInfo(file) {
  try {
    const img      = await loadImage(file)
    const hasAlpha = detectTransparency(img)
    return { width: img.naturalWidth, height: img.naturalHeight, hasAlpha, format: file.type, size: file.size }
  } catch { return null }
}
