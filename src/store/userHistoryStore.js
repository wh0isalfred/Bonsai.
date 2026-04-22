// src/store/userHistoryStore.js
// History backed by Supabase (logged-in users) or localStorage (anon).
// Builds on the excellent existing useHistory.js shape — same batch schema,
// just with a Supabase sync layer added on top.

import { create } from 'zustand'

// ── localStorage fallback (mirrors useHistory.js schema) ─────────────────────
const LS_KEY      = 'bonsai_history_v2'
const MAX_BATCHES = 50
const FREE_TTL_MS = 72 * 60 * 60 * 1000  // 72 hours (updated from old 48h)

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') }
  catch { return [] }
}
function lsSave(batches) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(batches.slice(0, MAX_BATCHES))) }
  catch {}
}

async function makeThumbnail(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const S = 64
      const c = document.createElement('canvas')
      const scale = Math.min(S / img.naturalWidth, S / img.naturalHeight)
      c.width  = Math.max(1, Math.round(img.naturalWidth  * scale))
      c.height = Math.max(1, Math.round(img.naturalHeight * scale))
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/webp', 0.6))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function tagBatch(b) {
  if (!b.expiresAt) return { ...b, state: 'active' }
  const ms = new Date(b.expiresAt).getTime() - Date.now()
  if (ms <= 0)                  return { ...b, state: 'expired' }
  if (ms < 3 * 60 * 60 * 1000) return { ...b, state: 'expiring_soon' }
  return { ...b, state: 'active' }
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useHistoryStore = create((set, get) => ({
  batches: lsLoad().map(tagBatch),

  // ── Add a completed compression batch ───────────────────────────────────────
  addBatch: async (completedFiles, isPro) => {
    const timestamp = new Date().toISOString()
    const expiresAt = isPro ? null : new Date(Date.now() + FREE_TTL_MS).toISOString()

    const totalOriginal   = completedFiles.reduce((s, f) => s + (f.size ?? 0), 0)
    const totalCompressed = completedFiles.reduce((s, f) => s + (f.result?.compressedSize ?? 0), 0)
    const savings = totalOriginal > 0
      ? Math.round((1 - totalCompressed / totalOriginal) * 100)
      : 0

    // Thumbnails for the first 4 files only
    const files = await Promise.all(
      completedFiles.slice(0, 4).map(async f => ({
        name:           f.result?.name ?? f.name,
        thumbnail:      f.result?.url ? await makeThumbnail(f.result.url) : null,
        originalSize:   f.size ?? 0,
        compressedSize: f.result?.compressedSize ?? 0,
        outputMime:     f.result?.outputMime ?? '',
      }))
    )

    const batch = {
      id:              `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      expiresAt,
      isPro,
      fileCount:       completedFiles.length,
      totalOriginal,
      totalCompressed,
      savings,
      files,
      state:           'active',
    }

    // ── Supabase sync (if user is logged in) ──────────────────────────────────
    // Dynamic import so supabase.js is not loaded for anon users
    try {
      const { supabase, isSupabaseReady } = await import('../lib/supabase')
      if (isSupabaseReady()) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: sb_batch } = await supabase.from('batches').insert({
            user_id:    session.user.id,
            mode:       isPro ? 'pro' : 'smart',
            preset:     null,
            file_count: completedFiles.length,
          }).select().single()

          if (sb_batch) {
            await supabase.from('history_items').insert(
              completedFiles.map(f => ({
                batch_id:        sb_batch.id,
                user_id:         session.user.id,
                filename:        f.name,
                original_size:   f.size ?? 0,
                compressed_size: f.result?.compressedSize ?? 0,
                output_mime:     f.result?.outputMime,
                width:           f.result?.width,
                height:          f.result?.height,
                expires_at:      expiresAt,
              }))
            )
          }
        }
      }
    } catch (e) {
      // Supabase is optional — localStorage is the source of truth for anon
    }

    set(s => {
      const next = [batch, ...s.batches].slice(0, MAX_BATCHES)
      lsSave(next)
      return { batches: next }
    })
  },

  // ── Delete a single batch ───────────────────────────────────────────────────
  deleteBatch: (id) => {
    set(s => {
      const next = s.batches.filter(b => b.id !== id)
      lsSave(next)
      return { batches: next }
    })
  },

  // ── Wipe everything ─────────────────────────────────────────────────────────
  clearHistory: () => {
    localStorage.removeItem(LS_KEY)
    set({ batches: [] })
  },

  // ── Refresh expiry tags (call periodically or on focus) ─────────────────────
  refreshTags: () => {
    set(s => ({ batches: s.batches.map(tagBatch) }))
  },
}))
