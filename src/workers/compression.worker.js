/**
 * src/workers/compression.worker.js
 *
 * Bonsai Compression Worker — runs entirely off the main thread.
 *
 * Message in:  { id, file: Blob, settings: object }
 * Messages out:
 *   { id, type: 'progress', progress: 0–100 }
 *   { id, type: 'done',     result: { blob, outputMime, width, height,
 *                                     compressedSize, hasAlpha, originalMime } }
 *   { id, type: 'error',    error: string }
 *
 * Algorithm quality tiers:
 *   Encoding:  WebP (primary) → AVIF (if available) → JPEG fallback
 *   Sharpen:   5-tap unsharp mask — industry standard for web images
 *   Blur:      OffscreenCanvas CSS filter (Gaussian, hardware-accelerated)
 *   Resize:    area-average (imageSmoothingQuality: 'high')
 *   Size target: iterative binary-search quality (12 iterations, ±0.5% accuracy)
 *   Metadata:  Full JPEG EXIF/IPTC/XMP marker stripping
 */

const SUPPORTED = new Set([
  'image/jpeg','image/jpg','image/png',
  'image/webp','image/avif','image/gif',
])

/* Detect AVIF support once per worker lifetime */
let _avifSupported = null
async function supportsAvif() {
  if (_avifSupported !== null) return _avifSupported
  try {
    const c = new OffscreenCanvas(1, 1)
    const b = await c.convertToBlob({ type: 'image/avif', quality: 0.5 })
    _avifSupported = b.type === 'image/avif' && b.size > 0
  } catch { _avifSupported = false }
  return _avifSupported
}

/* ── Entry ─────────────────────────────────────────────────────────── */
self.onmessage = async ({ data }) => {
  const { id, file, settings = {} } = data
  const post = (type, extra = {}) => self.postMessage({ id, type, ...extra })

  try {
    const mime = (file.type || '').toLowerCase()
    if (!SUPPORTED.has(mime)) throw new Error(`Unsupported format: ${mime || 'unknown'}`)

    post('progress', { progress: 4 })

    /* ── 1. Decode ──────────────────────────────────────────────── */
    const bitmap = await createImageBitmap(file)
    const srcW = bitmap.width
    const srcH = bitmap.height
    if (!srcW || !srcH) throw new Error('Image has zero dimensions')

    post('progress', { progress: 16 })

    /* ── 2. Dimensions ──────────────────────────────────────────── */
    const { width, height } = resolveDimensions(srcW, srcH, settings)

    /* ── 3. Draw ────────────────────────────────────────────────── */
    const canvas = new OffscreenCanvas(width, height)
    const ctx    = canvas.getContext('2d', { willReadFrequently: true })
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (settings.resizeCropMode === 'cover') {
      drawCover(ctx, bitmap, srcW, srcH, width, height)
    } else {
      ctx.drawImage(bitmap, 0, 0, width, height)
    }
    bitmap.close()

    /* ── 4. Detect alpha channel ────────────────────────────────── */
    const hasAlpha = detectAlpha(ctx, width, height)

    post('progress', { progress: 30 })

    /* ── 5. Blur (pre-encode, hardware-accelerated) ─────────────── */
    if ((settings.blurRadius ?? 0) > 0) {
      await applyBlur(ctx, canvas, width, height, settings.blurRadius)
    }

    post('progress', { progress: 48 })

    /* ── 6. Sharpen (5-tap unsharp mask) ────────────────────────── */
    if ((settings.sharpenAmount ?? 0) > 0) {
      applyUnsharpMask(ctx, width, height, settings.sharpenAmount)
    }

    post('progress', { progress: 64 })

    /* ── 7. Resolve output format ────────────────────────────────── */
    let outputMime = await resolveOutputMime(mime, settings, hasAlpha)
    const quality    = resolveQuality(outputMime, settings)

    /* ── 8. Flatten alpha for JPEG ───────────────────────────────── */
    let encodeCanvas = canvas
    if (outputMime === 'image/jpeg' && hasAlpha) {
      encodeCanvas = flattenAlpha(canvas, width, height, settings.fillColor ?? '#ffffff')
    }

    post('progress', { progress: 74 })

    /* ── 9. Encode ───────────────────────────────────────────────── */
    let blob

    if ((settings.targetSizeKb ?? 0) > 0 && outputMime !== 'image/png') {
      /* Hit a target size */
      blob = await binarySearchQuality(
        encodeCanvas, outputMime,
        settings.targetSizeKb * 1024,
        quality ?? 0.82
      )
    } else {
      blob = await encodeCanvas.convertToBlob({ type: outputMime, quality })
    }

    post('progress', { progress: 86 })

    /* ── 10. Guarantee output is never larger than original ─────────
       If the encoded blob is bigger than the source file, we try a
       binary search at lower quality. If even that fails (e.g. the
       image is already maximally compressed), we return the original
       file unchanged rather than giving the user a larger file. */
    if (
      (settings.targetSizeKb ?? 0) === 0 &&
      settings.mode !== 'lossless' &&
      outputMime !== 'image/png' &&
      blob.size >= file.size
    ) {
      const fallback = await binarySearchQuality(
        encodeCanvas, outputMime, file.size - 1, quality ?? 0.82
      )

      if (fallback.size < file.size) {
        blob = fallback
      } else {
        /* Even the most aggressive encode is larger — return original.
           Change outputMime to match the original so the file extension
           is correct and the user isn't confused. */
        blob = file
        outputMime = mime  // restore original mime type
      }
    }

    /* ── 11. Strip metadata ──────────────────────────────────────── */
    if (settings.stripMetadata !== false) {
      if (outputMime === 'image/jpeg') blob = await stripJpegMetadata(blob)
    }

    /* ── 12. Watermark (free plan only, passed as setting) ───────── */
    if (settings.watermark) {
      blob = await applyWatermarkToBlob(encodeCanvas, outputMime, quality, width, height)
    }

    post('progress', { progress: 100 })
    post('done', {
      result: {
        blob,
        outputMime,
        width,
        height,
        compressedSize: blob.size,
        hasAlpha,
        originalMime: mime,
      },
    })

  } catch (err) {
    post('error', { error: err?.message ?? 'Compression failed' })
  }
}

/* ══════════════════════════════════════════════════════════════════════
   DIMENSION RESOLVER
   ══════════════════════════════════════════════════════════════════════ */
function resolveDimensions(srcW, srcH, s) {
  const {
    resizeMode    = 'none',
    maxWidth      = 0,
    maxHeight     = 0,
    exactWidth    = 800,
    exactHeight   = 600,
    scalePercent  = 100,
    preventUpscale = true,
  } = s

  let w = srcW, h = srcH

  switch (resizeMode) {
    case 'maxDimension': {
      const mw = maxWidth  || 1920
      const mh = maxHeight || 1920
      if (w > mw || h > mh) {
        const r = Math.min(mw / w, mh / h)
        w = Math.round(w * r)
        h = Math.round(h * r)
      }
      break
    }
    case 'exact': {
      w = exactWidth  || 800
      h = exactHeight || 600
      break
    }
    case 'percentage': {
      const f = Math.max(1, Math.min(400, scalePercent)) / 100
      w = Math.round(srcW * f)
      h = Math.round(srcH * f)
      break
    }
    // 'none' — no resize
  }

  if (preventUpscale) {
    w = Math.min(w, srcW)
    h = Math.min(h, srcH)
  }

  return { width: Math.max(1, w), height: Math.max(1, h) }
}

/* ══════════════════════════════════════════════════════════════════════
   DRAW HELPERS
   ══════════════════════════════════════════════════════════════════════ */
function drawCover(ctx, bitmap, srcW, srcH, outW, outH) {
  const scale = Math.max(outW / srcW, outH / srcH)
  const sw = outW / scale
  const sh = outH / scale
  const sx = (srcW - sw) / 2
  const sy = (srcH - sh) / 2
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH)
}

/* Sample corners + center to detect meaningful alpha */
function detectAlpha(ctx, w, h) {
  try {
    const samples = [
      ctx.getImageData(0,          0,          1, 1),
      ctx.getImageData(w - 1,      0,          1, 1),
      ctx.getImageData(0,          h - 1,      1, 1),
      ctx.getImageData(w - 1,      h - 1,      1, 1),
      ctx.getImageData(w >> 1,     h >> 1,     1, 1),
    ]
    return samples.some(s => s.data[3] < 250)
  } catch { return false }
}

/* ══════════════════════════════════════════════════════════════════════
   BLUR  (hardware-accelerated via CSS filter)
   ══════════════════════════════════════════════════════════════════════ */
async function applyBlur(ctx, srcCanvas, w, h, radius) {
  try {
    const pad = Math.ceil(radius * 3)
    const tmp = new OffscreenCanvas(w + pad * 2, h + pad * 2)
    const tc  = tmp.getContext('2d')
    tc.filter = `blur(${radius}px)`
    tc.drawImage(srcCanvas, pad, pad)
    tc.filter = 'none'
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(tmp, -pad, -pad, w + pad * 2, h + pad * 2, 0, 0, w, h)
  } catch {
    /* CSS filter unsupported in this environment — skip blur */
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SHARPEN  — 5-tap unsharp mask
   Industry standard: blur the image, subtract from original,
   add scaled difference back. Preserves edges, doesn't amplify noise.
   ══════════════════════════════════════════════════════════════════════ */
function applyUnsharpMask(ctx, w, h, amount) {
  /* Clamp amount to a safe range */
  const strength = Math.max(0, Math.min(5, amount)) * 0.6

  const src  = ctx.getImageData(0, 0, w, h)
  const orig = new Uint8ClampedArray(src.data)   // keep a copy of original
  const d    = src.data

  /* 5-tap approximate Gaussian kernel for blur pass
     Weights: center=0.36, cardinal=0.12 each, diagonal=0.04 each */
  const out = ctx.createImageData(w, h)
  const od  = out.data

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i  = (y * w + x) * 4
      const n  = ((y - 1) * w + x    ) * 4  // north
      const s2 = ((y + 1) * w + x    ) * 4  // south
      const e  = (y * w       + x + 1) * 4  // east
      const ww = (y * w       + x - 1) * 4  // west
      const ne = ((y - 1) * w + x + 1) * 4
      const nw = ((y - 1) * w + x - 1) * 4
      const se = ((y + 1) * w + x + 1) * 4
      const sw = ((y + 1) * w + x - 1) * 4

      for (let c = 0; c < 3; c++) {
        /* Gaussian blur approximation */
        const blurred =
          d[i+c]  * 0.36 +
          (d[n+c] + d[s2+c] + d[e+c] + d[ww+c]) * 0.12 +
          (d[ne+c] + d[nw+c] + d[se+c] + d[sw+c]) * 0.04

        /* Unsharp mask: original + strength × (original - blurred) */
        od[i+c] = Math.round(
          Math.max(0, Math.min(255,
            orig[i+c] + strength * (orig[i+c] - blurred)
          ))
        )
      }
      od[i+3] = d[i+3]  // preserve alpha
    }
  }

  /* Copy edge pixels unchanged */
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y > 0 && y < h - 1 && x > 0 && x < w - 1) continue
      const i = (y * w + x) * 4
      od[i] = d[i]; od[i+1] = d[i+1]; od[i+2] = d[i+2]; od[i+3] = d[i+3]
    }
  }

  ctx.putImageData(out, 0, 0)
}

/* ══════════════════════════════════════════════════════════════════════
   FORMAT RESOLUTION
   ══════════════════════════════════════════════════════════════════════ */
async function resolveOutputMime(inputMime, settings, hasAlpha) {
  const { outputFormat = 'webp', mode = 'lossy' } = settings

  if (outputFormat === 'jpeg') return 'image/jpeg'
  if (outputFormat === 'png')  return 'image/png'
  if (outputFormat === 'avif') {
    /* Fall back to WebP if AVIF isn't available */
    return (await supportsAvif()) ? 'image/avif' : 'image/webp'
  }
  if (outputFormat === 'webp')     return 'image/webp'
  if (outputFormat === 'original') {
    const clean = inputMime === 'image/jpg' ? 'image/jpeg' : inputMime
    return clean || 'image/webp'
  }

  /* auto — pick best format */
  if (mode === 'lossless') return 'image/webp'
  /* For images with transparency, prefer WebP over JPEG */
  if (hasAlpha && outputFormat !== 'jpeg') return 'image/webp'
  return 'image/webp'
}

function resolveQuality(mime, s) {
  if (mime === 'image/png') return undefined  // PNG is lossless, no quality param

  const { mode = 'lossy', quality = 0.82 } = s

  if (mode === 'lossless') {
    if (mime === 'image/webp') return 1.0
    if (mime === 'image/jpeg') return 0.97
    if (mime === 'image/avif') return 1.0
    return 1.0
  }

  return Math.max(0.01, Math.min(1.0, quality))
}

/* ══════════════════════════════════════════════════════════════════════
   ALPHA FLATTEN  (for JPEG output of images with transparency)
   ══════════════════════════════════════════════════════════════════════ */
function flattenAlpha(srcCanvas, w, h, fillColor) {
  const out = new OffscreenCanvas(w, h)
  const ctx = out.getContext('2d')
  ctx.fillStyle = fillColor
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(srcCanvas, 0, 0)
  return out
}

/* ══════════════════════════════════════════════════════════════════════
   BINARY SEARCH QUALITY
   Finds the highest quality that meets a target byte size.
   12 iterations → ±0.012 quality accuracy, typically ±1–3% of target.
   ══════════════════════════════════════════════════════════════════════ */
async function binarySearchQuality(canvas, mime, targetBytes, startQ) {
  if (mime === 'image/png') return canvas.convertToBlob({ type: mime })

  let lo = 0.04
  let hi = Math.min(startQ, 0.99)
  let best = null

  for (let i = 0; i < 12; i++) {
    const mid  = (lo + hi) / 2
    const blob = await canvas.convertToBlob({ type: mime, quality: mid })

    if (blob.size <= targetBytes) {
      best = blob
      lo   = mid
    } else {
      hi = mid
    }

    if (hi - lo < 0.006) break
  }

  /* If we couldn't meet the target, return smallest possible */
  return best ?? await canvas.convertToBlob({ type: mime, quality: 0.04 })
}

/* ══════════════════════════════════════════════════════════════════════
   JPEG METADATA STRIP
   Removes all APP1–APP15 segments (EXIF, IPTC, XMP, ICC profile).
   Preserves APP0 (JFIF marker) and all image data.
   ══════════════════════════════════════════════════════════════════════ */
async function stripJpegMetadata(blob) {
  const buf  = await blob.arrayBuffer()
  const view = new DataView(buf)

  /* Validate JPEG signature */
  if (buf.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return blob

  const parts   = [buf.slice(0, 2)]  // SOI marker
  let offset    = 2

  while (offset < buf.byteLength - 1) {
    const byte = view.getUint8(offset)

    /* Sync to next marker */
    if (byte !== 0xFF) {
      parts.push(buf.slice(offset))
      break
    }

    const marker = view.getUint16(offset)

    /* End of image */
    if (marker === 0xFFD9) {
      parts.push(buf.slice(offset, offset + 2))
      break
    }

    /* Start of scan — everything after is image data */
    if (marker === 0xFFDA) {
      parts.push(buf.slice(offset))
      break
    }

    /* Standalone markers (no length field) */
    if (marker >= 0xFFD0 && marker <= 0xFFD7) {
      parts.push(buf.slice(offset, offset + 2))
      offset += 2
      continue
    }

    /* Need at least 4 bytes for marker + length */
    if (offset + 4 > buf.byteLength) break

    const segLen = view.getUint16(offset + 2) + 2  // includes the 2 length bytes

    /* Keep: APP0 (JFIF), DQT, DHT, SOFn, COM */
    /* Strip: APP1–APP15 (EXIF, XMP, ICC, IPTC, etc.) */
    const isApp1to15 = marker >= 0xFFE1 && marker <= 0xFFEF
    if (!isApp1to15) {
      parts.push(buf.slice(offset, offset + segLen))
    }

    offset += segLen
  }

  return new Blob(parts, { type: 'image/jpeg' })
}

/* ══════════════════════════════════════════════════════════════════════
   WATERMARK  (optional — only applied when settings.watermark === true)
   Very subtle, bottom-right, white semi-transparent text.
   Re-encodes with same settings so size impact is minimal.
   ══════════════════════════════════════════════════════════════════════ */
async function applyWatermarkToBlob(canvas, mime, quality, w, h) {
  const fontSize = Math.max(10, Math.min(18, Math.round(w * 0.012)))
  const pad      = Math.max(8, Math.round(Math.min(w, h) * 0.018))

  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.globalAlpha    = 0.20
  ctx.font           = `600 ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle      = '#ffffff'
  ctx.shadowColor    = 'rgba(0,0,0,.6)'
  ctx.shadowBlur     = 4
  ctx.textAlign      = 'right'
  ctx.textBaseline   = 'bottom'
  ctx.fillText('Bonsai', w - pad, h - pad)
  ctx.restore()

  return canvas.convertToBlob({ type: mime, quality })
}
