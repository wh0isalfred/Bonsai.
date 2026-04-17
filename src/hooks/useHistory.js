// useHistory.js
// Persists recent compressions to localStorage.
// Each entry: { id, name, originalSize, compressedSize, savings, outputMime, date, thumbnail }
// Thumbnail is a tiny base64 data URL (max 40×40) so we don't bloat storage.

import { useState, useCallback, useEffect } from 'react'

const KEY    = 'bonsai_history_v1'
const MAX    = 30   // max entries kept

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
  catch { return [] }
}

function save(entries) {
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX))) }
  catch {
    // If we exceed storage quota, just trim the list and try again
  } // storage full — silently ignore
}

// Generates a tiny thumbnail from a blob URL
async function makeThumbnail(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 40
      const c    = document.createElement('canvas')
      const scale = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight)
      c.width  = Math.round(img.naturalWidth  * scale)
      c.height = Math.round(img.naturalHeight * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/webp', 0.7))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export function useHistory() {
  const [entries, setEntries] = useState(load)

  // Reload if another tab modifies storage
  useEffect(() => {
    const handle = () => setEntries(load())
    window.addEventListener('storage', handle)
    return () => window.removeEventListener('storage', handle)
  }, [])

  const addEntry = useCallback(async (result, file) => {
    const thumbnail = result.url ? await makeThumbnail(result.url) : null
    const entry = {
      id:             result.name + '_' + Date.now(),
      name:           result.name,
      originalName:   file.name,
      originalSize:   result.originalSize,
      compressedSize: result.compressedSize,
      savings:        Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100),
      outputMime:     result.outputMime,
      date:           new Date().toISOString(),
      thumbnail,
    }
    setEntries(prev => {
      const next = [entry, ...prev].slice(0, MAX)
      save(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    localStorage.removeItem(KEY)
    setEntries([])
  }, [])

  return { entries, addEntry, clearHistory }
}
