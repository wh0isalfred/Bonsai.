<div align="center">

# 🌿 Bonsai

### Professional image compression. Refined to the essentials.

**[bonsaicomp.netlify.app](https://bonsaicomp.netlify.app)** · Free to use · No uploads · No account required

---

*Trim the size. Keep the quality.*

</div>

---

## What it is

Bonsai is a browser-based image compression tool built for professionals. It compresses JPEG, PNG, WebP, and AVIF images entirely client-side — **nothing is uploaded to a server**. Your files never leave your device.

Two modes:

- **Smart Mode** — drop images, pick a compression preset, download. Free, no sign-up.
- **Pro Mode** — per-image editor with live before/after preview, quality/blur/sharpen/resize controls, real-time size estimates, and format conversion.

---

## Engineering highlights

### Compression runs entirely off the main thread

All encoding happens inside a **Web Worker** (`src/workers/compression.worker.js`). The UI never blocks — users can continue editing other images while previous ones compress in parallel. Each image spawns its own worker instance which is terminated after the job completes to free memory.

```js
const worker = new Worker(
  new URL('../workers/compression.worker.js', import.meta.url),
  { type: 'module' }
)
worker.postMessage({ id, file, settings })
worker.onmessage = ({ data }) => { /* progress → done → error */ }
```

### Quality targeting via binary search

Instead of guessing a quality level, Bonsai finds the highest quality that meets a target file size using **iterative binary search** (12 iterations, ±0.6% accuracy). This is the same approach used by professional encoding tools.

```js
async function binarySearchQuality(canvas, mime, targetBytes, startQ) {
  let lo = 0.04, hi = Math.min(startQ, 0.99), best = null
  for (let i = 0; i < 12; i++) {
    const mid  = (lo + hi) / 2
    const blob = await canvas.convertToBlob({ type: mime, quality: mid })
    blob.size <= targetBytes ? (best = blob, lo = mid) : (hi = mid)
    if (hi - lo < 0.006) break
  }
  return best ?? canvas.convertToBlob({ type: mime, quality: 0.04 })
}
```

### 5-tap unsharp mask (same algorithm as Lightroom/Photoshop)

Sharpening uses a proper **Gaussian unsharp mask** rather than a simple convolution. A blur pass is computed using weighted neighbourhood sampling, then the difference between the original and the blur is scaled and added back. This sharpens edges while leaving smooth gradients untouched — preventing the noise amplification that naive sharpening kernels cause.

```js
// Gaussian kernel: centre × 0.36, cardinals × 0.12, diagonals × 0.04
const blurred =
  d[i+c]  * 0.36 +
  (d[n+c] + d[s+c] + d[e+c] + d[w+c]) * 0.12 +
  (d[ne+c] + d[nw+c] + d[se+c] + d[sw+c]) * 0.04

od[i+c] = clamp(orig[i+c] + strength * (orig[i+c] - blurred), 0, 255)
```

### Full JPEG metadata strip

EXIF, IPTC, XMP, and ICC profile data is removed by parsing the JPEG binary directly and stripping all `APP1`–`APP15` marker segments while preserving the image data, `APP0` (JFIF header), quantisation tables, Huffman tables, and scan data. No external library — pure `DataView` manipulation.

### Size inflation guarantee

If re-encoding a file (e.g. a well-compressed JPEG to WebP) produces a *larger* file than the original, Bonsai returns the original unchanged. Many tools silently inflate files — Bonsai never does.

### Live preview without a worker

Pro mode generates a live before/after preview as the user adjusts sliders. Instead of spawning a worker for each preview (too slow), it encodes a **640px thumbnail on the main thread** using `canvas.toBlob()` and extrapolates the full-resolution size using the pixel-area ratio (`blob.size / scale²`). This runs in ~5–20ms, fast enough to feel instantaneous.

The preview function is debounced (320ms) and stored in a `useRef` so the debounce instance is **stable across renders** — a common React pitfall that causes the timer to reset on every render, making the preview never fire.

```js
// Stable debounce — created once, never recreated
const generatePreview = useRef(
  debounce(async (id, file, settings, prevUrlsMap) => {
    const { url, estimatedSize } = await renderPreview(file, settings)
    patchRef.current(id, { previewUrl: url, estimatedSize })
  }, 320)
).current
```

### History with IndexedDB blob persistence

Compressed files are stored as blobs in **IndexedDB** (not localStorage, which has a 5MB cap) so users can re-download past sessions. Metadata (timestamps, sizes, thumbnails) lives in localStorage for fast reads. Blobs are keyed by `batchId:index` and cleaned up on expiry — 72 hours for free users, 14 days for Pro.

### Preset size estimation

When images are staged in Smart mode, Bonsai estimates the output size for all four presets simultaneously. It encodes each file at 320px at each preset's quality, extrapolates to full resolution, and sums across all files. This gives the user a concrete number — `~640 KB` rather than `High quality` — before they've compressed anything.

---

## UX decisions worth noting

**Gate the download, not the UI.** Free users have full access to the compression editor and see all results. The paywall only appears at the moment of download — after the user has experienced the product's value. Conversion happens at the right moment.

**Side effects outside state updaters.** React's state updater functions must be pure. Async side effects (triggering preview generation, spawning workers) are always called outside `setState` — a correctness requirement in concurrent React that most implementations get wrong.

**Pointer Events API for the comparison slider.** The before/after drag handle uses `onPointerDown/Move/Up` rather than separate mouse and touch handlers. One code path handles mouse, touch, and stylus uniformly.

---

## Architecture

```
src/
├── workers/
│   └── compression.worker.js   # All encoding — runs off main thread
├── features/
│   ├── tools/image/
│   │   ├── smart/               # SmartCompressor, PresetPicker, ResultsGrid
│   │   └── pro/                 # ProEditor, EditorControls, ProQueue
│   ├── auth/                    # AuthModal (email/password, forgot password)
│   └── history/                 # HistoryPanel, BatchCard
├── store/
│   ├── useAuthStore.js          # Supabase auth + plan state
│   ├── useModeStore.js          # Smart/Pro toggle + trial state
│   └── userHistoryStore.js      # Batch history + IndexedDB sync
├── lib/
│   ├── supabase.js              # Supabase client
│   └── historyDB.js             # IndexedDB wrapper (saveBatchBlobs, getBatchBlobs)
├── config/
│   └── presets.js               # Single source of truth for compression presets
└── styles/
    └── index.css                # Sumi design system — CSS custom properties
supabase/
└── functions/
    ├── create-checkout-session/ # Stripe checkout (Deno, Edge Function)
    └── stripe-webhook/          # Plan sync on payment/cancellation (Deno)
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite (Rolldown) |
| State | Zustand |
| Styling | Custom CSS design system (no framework) |
| Compression | Canvas API, OffscreenCanvas, Web Workers |
| Persistence | IndexedDB (blobs), localStorage (metadata) |
| Auth & DB | Supabase (PostgreSQL + Auth) |
| Payments | Stripe (subscriptions + webhooks) |
| Email | Resend (SMTP) |
| Backend | Supabase Edge Functions (Deno / TypeScript) |
| Hosting | Netlify (CI/CD from GitHub) |

---

## Running locally

```bash
git clone https://github.com/wh0isalfred/Bonsai
cd Bonsai
npm install
```

Create `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PRO_PRICE_ID=price_...
VITE_STRIPE_SUPPORTER_PRICE_ID=price_...
```

```bash
npm run dev
```

Smart mode works without any environment variables. Auth and payments require Supabase and Stripe credentials respectively.

---

## Supported formats

| Input | Output |
|---|---|
| JPEG | WebP, AVIF, JPEG, PNG, Original |
| PNG | WebP, AVIF, JPEG, PNG |
| WebP | WebP, AVIF, JPEG, PNG |
| AVIF | WebP, JPEG, PNG |
| GIF | WebP, JPEG |

---

## Pricing

| | Free | Supporter ($1/mo) | Pro ($3/mo) |
|---|---|---|---|
| Smart Mode | ✓ up to 15 images | ✓ unlimited | ✓ unlimited |
| Pro Mode | — | — | ✓ |
| History window | 72 hours | — | 14 days |
| Re-download | ✓ | ✓ | ✓ |

---

## License

MIT
