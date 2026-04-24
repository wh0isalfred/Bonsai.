/**
 * src/store/userHistoryStore.js
 *
 * Compression history store.
 *
 * Expiry rules:
 *   Free users   → 72 hours from compression time
 *   Pro/Supporter → 2 weeks from compression time
 *
 * After expiry the batch metadata remains visible but grayed out,
 * blobs are deleted from IndexedDB and cannot be re-downloaded.
 *
 * Re-download: blobs are stored in IndexedDB (historyDB.js) at save time.
 * `downloadBatch(id)` fetches them and creates a ZIP via JSZip.
 */

import { create } from 'zustand'
import {
  saveBatchBlobs,
  getBatchBlobs,
  deleteBatchBlobs,
  deleteManyBatchBlobs,
  clearAllBlobs,
} from '../lib/historyDB'

const LS_KEY         = 'bonsai_history_v2'
const MAX_BATCHES    = 80
const FREE_TTL_MS    = 72 * 60 * 60 * 1000        // 72 hours
const PRO_TTL_MS     = 14 * 24 * 60 * 60 * 1000   // 2 weeks

/* ── localStorage helpers ──────────────────────────────────────────── */
function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') }
  catch { return [] }
}
function lsSave(batches) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(batches.slice(0, MAX_BATCHES))) }
  catch {}
}

/* ── Thumbnail generator (64px, for preview only) ─────────────────── */
async function makeThumbnail(blob) {
  if (!blob) return null
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const S = 64
      const scale = Math.min(S / img.naturalWidth, S / img.naturalHeight)
      const c = document.createElement('canvas')
      c.width  = Math.max(1, Math.round(img.naturalWidth  * scale))
      c.height = Math.max(1, Math.round(img.naturalHeight * scale))
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/webp', 0.6))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/* ── Expiry tagging ────────────────────────────────────────────────── */
function tagBatch(b) {
  if (!b.expiresAt) return { ...b, state: 'active' }
  const ms = new Date(b.expiresAt).getTime() - Date.now()
  if (ms <= 0)                   return { ...b, state: 'expired' }
  if (ms < 6 * 60 * 60 * 1000)  return { ...b, state: 'expiring_soon' }  // <6h
  return { ...b, state: 'active' }
}

/* ── Prune expired blobs on startup ────────────────────────────────── */
async function pruneExpiredBlobs(batches) {
  const expired = batches.filter(b => b.state === 'expired')
  if (!expired.length) return
  try {
    await deleteManyBatchBlobs(
      expired.map(b => ({ batchId: b.id, fileCount: b.fileCount }))
    )
  } catch {}
}

/* ══════════════════════════════════════════════════════════════════════
   STORE
   ══════════════════════════════════════════════════════════════════════ */
const initial = lsLoad().map(tagBatch)

export const useHistoryStore = create((set, get) => ({
  batches: initial,

  /* ── Add a completed compression batch ──────────────────────────── */
  addBatch: async (completedFiles, isPro) => {
    const doneFiles  = completedFiles.filter(f => f.status === 'done' && f.result?.blob)
    if (!doneFiles.length) return

    const timestamp  = new Date().toISOString()
    const ttl        = isPro ? PRO_TTL_MS : FREE_TTL_MS
    const expiresAt  = new Date(Date.now() + ttl).toISOString()

    const totalOriginal   = completedFiles.reduce((s, f) => s + (f.size ?? 0), 0)
    const totalCompressed = doneFiles.reduce((s, f) => s + (f.result.compressedSize ?? 0), 0)
    const savings         = totalOriginal > 0
      ? Math.round((1 - totalCompressed / totalOriginal) * 100)
      : 0

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    /* Thumbnails for the first 4 done files — for visual display only */
    const previewFiles = await Promise.all(
      doneFiles.slice(0, 4).map(async f => ({
        name:           f.name,
        thumbnail:      await makeThumbnail(f.result.blob),
        originalSize:   f.size ?? 0,
        compressedSize: f.result.compressedSize ?? 0,
        outputMime:     f.result.outputMime ?? '',
      }))
    )

    const batch = {
      id:             batchId,
      timestamp,
      expiresAt,
      isPro,
      fileCount:      doneFiles.length,
      totalOriginal,
      totalCompressed,
      savings,
      files:          previewFiles,
      state:          'active',
      hasBlobs:       true,   // signals that IndexedDB data exists
    }

    /* Persist blobs to IndexedDB for re-download */
    try {
      await saveBatchBlobs(batchId, doneFiles)
    } catch (e) {
      console.warn('[Bonsai] Could not save blobs to IndexedDB:', e)
      batch.hasBlobs = false
    }

    /* Supabase sync (optional, non-blocking) */
    try {
      const { supabase, isSupabaseReady } = await import('../lib/supabase')
      if (isSupabaseReady() && supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: sb_batch } = await supabase
            .from('batches')
            .insert({
              user_id:    session.user.id,
              mode:       isPro ? 'pro' : 'smart',
              file_count: doneFiles.length,
            })
            .select()
            .single()

          if (sb_batch) {
            await supabase.from('history_items').insert(
              doneFiles.map(f => ({
                batch_id:        sb_batch.id,
                user_id:         session.user.id,
                filename:        f.name,
                original_size:   f.size ?? 0,
                compressed_size: f.result.compressedSize ?? 0,
                output_mime:     f.result.outputMime,
                width:           f.result.width,
                height:          f.result.height,
                expires_at:      expiresAt,
              }))
            )
          }
        }
      }
    } catch {}

    set(s => {
      const next = [batch, ...s.batches].slice(0, MAX_BATCHES)
      lsSave(next)
      return { batches: next }
    })
  },

  /* ── Download a batch as ZIP ────────────────────────────────────── */
  downloadBatch: async (batchId) => {
    const batch = get().batches.find(b => b.id === batchId)
    if (!batch || batch.state === 'expired' || !batch.hasBlobs) return

    try {
      /* Load JSZip dynamically so it doesn't hit the initial bundle */
      const JSZip = (await import('jszip')).default
      const zip   = new JSZip()

      const blobs = await getBatchBlobs(batchId, batch.fileCount)
      if (!blobs.length) {
        /* Blobs missing — mark as no longer downloadable */
        set(s => ({
          batches: s.batches.map(b =>
            b.id === batchId ? { ...b, hasBlobs: false } : b
          ),
        }))
        return
      }

      blobs.forEach(({ blob, name, outputMime }) => {
        /* Strip old extension and add correct one */
        const ext     = outputMime?.split('/')[1]?.replace('jpeg','jpg') ?? 'webp'
        const base    = name.replace(/\.[^/.]+$/, '')
        const zipName = `${base}_bonsai.${ext}`
        zip.file(zipName, blob)
      })

      const content  = await zip.generateAsync({ type: 'blob' })
      const url      = URL.createObjectURL(content)
      const dateStr  = new Date(batch.timestamp).toLocaleDateString('en-GB').replace(/\//g, '-')
      const filename = `bonsai-${batch.fileCount}-images-${dateStr}.zip`

      const a  = document.createElement('a')
      a.href   = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)

    } catch (e) {
      console.error('[Bonsai] Download failed:', e)
    }
  },

  /* ── Delete a single batch ──────────────────────────────────────── */
  deleteBatch: async (id) => {
    const batch = get().batches.find(b => b.id === id)
    if (batch) {
      try { await deleteBatchBlobs(id, batch.fileCount) } catch {}
    }
    set(s => {
      const next = s.batches.filter(b => b.id !== id)
      lsSave(next)
      return { batches: next }
    })
  },

  /* ── Wipe all history ───────────────────────────────────────────── */
  clearHistory: async () => {
    try { await clearAllBlobs() } catch {}
    localStorage.removeItem(LS_KEY)
    set({ batches: [] })
  },

  /* ── Refresh expiry tags (call on focus or periodically) ────────── */
  refreshTags: () => {
    const batches = get().batches.map(tagBatch)
    /* Prune blobs for newly-expired batches */
    pruneExpiredBlobs(batches)
    lsSave(batches)
    set({ batches })
  },
}))

/* Prune expired blobs once on load */
pruneExpiredBlobs(initial)
