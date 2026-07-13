/**
 * src/lib/watermark.js
 *
 * ONE definition of the Bonsai mark, shared by two callers:
 *   - compression.worker.js  → burns it into the exported file
 *   - ProEditor renderPreview → shows it in the live preview
 *
 * These MUST stay identical. If the preview shows a clean image and the
 * export arrives marked, that's a bait-and-switch — the user tuned their
 * sliders against a lie. Keeping the draw call in one function is the only
 * way to guarantee they can't drift apart.
 *
 * Works on both CanvasRenderingContext2D (main thread) and
 * OffscreenCanvasRenderingContext2D (worker) — the API surface used here
 * is common to both.
 *
 * Scale-aware: the mark is sized as a fraction of the image's smaller edge,
 * so a 320px preview and a 4000px export show a proportionally identical
 * mark. A fixed pixel size would look huge in preview and invisible in the
 * export.
 */

const TEXT          = 'Bonsai'
const MARGIN_RATIO  = 0.025   // padding from the corner, as a fraction of min edge
const FONT_RATIO    = 0.035   // cap height, as a fraction of min edge
const MIN_FONT_PX   = 9
const MAX_FONT_PX   = 42

/**
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
 * @param {number} w  canvas width
 * @param {number} h  canvas height
 */
export function drawWatermark(ctx, w, h) {
  const minEdge = Math.min(w, h)

  const fontPx = Math.round(
    Math.max(MIN_FONT_PX, Math.min(MAX_FONT_PX, minEdge * FONT_RATIO))
  )
  const margin = Math.round(minEdge * MARGIN_RATIO)

  ctx.save()

  ctx.font         = `600 ${fontPx}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'bottom'

  const x = w - margin
  const y = h - margin

  /* Dark shadow first — keeps the mark legible on light images.
     Without this it vanishes entirely on a white background. */
  ctx.globalAlpha = 0.30
  ctx.fillStyle   = '#000000'
  ctx.fillText(TEXT, x + 1, y + 1)

  /* Light mark on top — legible on dark images. */
  ctx.globalAlpha = 0.75
  ctx.fillStyle   = '#FFFFFF'
  ctx.fillText(TEXT, x, y)

  ctx.restore()
}

/**
 * Convenience for callers that only have a settings object.
 * `watermark` is set by withPlanWatermark() in config/presets.js.
 */
export function maybeDrawWatermark(ctx, w, h, settings) {
  if (settings?.watermark) drawWatermark(ctx, w, h)
}
