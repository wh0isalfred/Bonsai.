
const SUPPORTED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png',
  'image/webp', 'image/avif',
])

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

// 🔥 SMART FORMAT DECISION
function resolveOutputMime(file, settings, hasAlpha = false) {
  const { outputFormat, quality } = settings

  // Manual override
  if (outputFormat && outputFormat !== 'auto') {
    return {
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      png: 'image/png',
    }[outputFormat] ?? 'image/jpeg'
  }

  // PNG logic
  if (file.type === 'image/png') {

    // If transparency exists → preserve or use WebP
    if (hasAlpha) {
      return (quality ?? 0.8) < 0.85 ? 'image/webp' : 'image/png'
    }

    // No transparency → compress like photo
    if ((quality ?? 0.8) <= 0.7) {
      return 'image/webp' // extreme/high
    }

    return 'image/jpeg' // normal/low
  }

  // Keep WebP
  if (file.type === 'image/webp') return 'image/webp'

  // Default
  return 'image/jpeg'
}

function resolveDimensions(img, settings) {
  const { resizeMode = 'maxDimension', maxDimension = 1920 } = settings
  const ow = img.naturalWidth
  const oh = img.naturalHeight

  if (resizeMode === 'none') return { width: ow, height: oh }
  if (ow <= maxDimension && oh <= maxDimension) return { width: ow, height: oh }

  const ratio = Math.min(maxDimension / ow, maxDimension / oh)
  return {
    width: Math.round(ow * ratio),
    height: Math.round(oh * ratio)
  }
}

// 🔥 ALWAYS DRAW SAFELY (PNG FIRST)
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

// 🔥 TRANSPARENCY DETECTION
async function hasTransparency(canvas) {
  const ctx = canvas.getContext('2d')
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

async function compressToTargetSize(canvas, mime, targetBytes, startQuality) {
  let lo = 0.1, hi = startQuality, best = null

  for (let i = 0; i < 8; i++) {
    const mid  = (lo + hi) / 2
    const blob = await canvasToBlob(canvas, mime, mid)

    if (blob.size <= targetBytes) {
      best = blob
      lo = mid
    } else {
      hi = mid
    }

    if (hi - lo < 0.02) break
  }

  return best ?? await canvasToBlob(canvas, mime, 0.1)
}

async function stripExif(blob) {
  const buf  = await blob.arrayBuffer()
  const view = new DataView(buf)

  if (view.getUint16(0) !== 0xFFD8) return blob

  const parts = [buf.slice(0, 2)]
  let offset  = 2

  while (offset < buf.byteLength - 1) {
    if (view.getUint8(offset) !== 0xFF) {
      parts.push(buf.slice(offset))
      break
    }

    const marker = view.getUint16(offset)

    if (marker === 0xFFD9) {
      parts.push(buf.slice(offset, offset + 2))
      break
    }

    if (marker === 0xFFDA) {
      parts.push(buf.slice(offset))
      break
    }

    if (marker >= 0xFFD0 && marker <= 0xFFD7) {
      parts.push(buf.slice(offset, offset + 2))
      offset += 2
      continue
    }

    if (offset + 4 > buf.byteLength) break

    const len = view.getUint16(offset + 2) + 2

    if (marker !== 0xFFE1) {
      parts.push(buf.slice(offset, offset + len))
    }

    offset += len
  }

  return new Blob(parts, { type: 'image/jpeg' })
}

export async function compressImage(file, settings = {}, onProgress) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error(`Unsupported format: ${file.type || 'unknown'}`)
  }

  onProgress?.(5)

  const img = await loadImage(file)

  onProgress?.(20)

  const { width, height } = resolveDimensions(img, settings)

  // 🔥 STEP 1: Draw safely (preserve all data)
  const canvas = drawToCanvas(img, width, height)

  // 🔥 STEP 2: Detect transparency
  const transparent = await hasTransparency(canvas)

  // 🔥 STEP 3: Decide output format
  const outputMime = resolveOutputMime(file, settings, transparent)

  // 🔥 STEP 4: Handle JPEG background
  if (outputMime === 'image/jpeg') {
    const ctx = canvas.getContext('2d')
    const temp = document.createElement('canvas')
    temp.width = canvas.width
    temp.height = canvas.height

    const tctx = temp.getContext('2d')
    tctx.fillStyle = '#ffffff'
    tctx.fillRect(0, 0, temp.width, temp.height)
    tctx.drawImage(canvas, 0, 0)

    canvas.width = temp.width
    canvas.height = temp.height
    canvas.getContext('2d').drawImage(temp, 0, 0)
  }

  const quality = outputMime === 'image/png'
    ? undefined
    : (settings.quality ?? 0.82)

  onProgress?.(50)

  let blob = settings.targetSizeKb > 0 && outputMime !== 'image/png'
    ? await compressToTargetSize(canvas, outputMime, settings.targetSizeKb * 1024, quality)
    : await canvasToBlob(canvas, outputMime, quality)

  onProgress?.(75)

  if (settings.stripMetadata && outputMime === 'image/jpeg') {
    blob = await stripExif(blob)
  }

  // 🔥 Fallback if compression failed
  if (blob.size >= file.size && outputMime !== 'image/png' && settings.mode !== 'lossless') {
    const fallback = await canvasToBlob(
      canvas,
      outputMime,
      Math.max((quality ?? 0.82) - 0.15, 0.4)
    )

    if (fallback.size < blob.size) blob = fallback
  }

  onProgress?.(100)

  const ext = {
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/png': 'png'
  }[outputMime] ?? 'jpg'

  const baseName = file.name.replace(/\.[^/.]+$/, '')

  return {
    blob,
    name: `${baseName}_bonsai.${ext}`,
    originalSize: file.size,
    compressedSize: blob.size,
    width,
    height,
    outputMime,
    url: URL.createObjectURL(blob),
  }
}

export function validateFile(file) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    return { valid: false, reason: `${file.type || 'Unknown'} not supported` }
  }

  if (file.size > 50 * 1024 * 1024) {
    return { valid: false, reason: 'Exceeds 50 MB limit' }
  }

  return { valid: true }
}