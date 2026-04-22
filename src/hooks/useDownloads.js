// src/hooks/useDownloads.js
// Download utilities: single file, all as ZIP, or ZIP-as-folder structure.
// Requires: npm install jszip  (add to package.json if not already present)

import { useCallback } from 'react'

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png':  'png',
  'image/avif': 'avif',
}

function resolveFilename(file) {
  const base = (file.outputName || file.name || 'image').replace(/\.[^/.]+$/, '')
  const ext  = MIME_TO_EXT[file.result?.outputMime] ?? 'webp'
  return `${base}.${ext}`
}

function triggerDownload(url, filename) {
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function useDownloads() {

  /** Download a single compressed file. */
  const downloadOne = useCallback((file) => {
    if (!file?.result?.url) return
    triggerDownload(file.result.url, resolveFilename(file))
  }, [])

  /** Download all done files.
   *  1 file → direct download. 2+ files → ZIP. */
  const downloadAll = useCallback(async (files) => {
    const done = files.filter(f => f.status === 'done' && f.result?.blob)
    if (!done.length) return
    if (done.length === 1) { downloadOne(done[0]); return }
    await downloadZip(done)
  }, [downloadOne])

  /** Download a ZIP containing all done files.
   *  @param {object[]} files  - file entries from the store
   *  @param {string}   [name] - archive name (without .zip)
   */
  const downloadZip = useCallback(async (files, name = 'bonsai-compressed') => {
    const done = files.filter(f => f.status === 'done' && f.result?.blob)
    if (!done.length) return

    try {
      // Dynamic import — no bundle cost until user actually clicks Download ZIP
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()

      // Deduplicate filenames inside the ZIP
      const seen = new Map()
      done.forEach(f => {
        let filename = resolveFilename(f)
        if (seen.has(filename)) {
          const n = seen.get(filename) + 1
          seen.set(filename, n)
          const [base, ext] = filename.split(/\.(?=[^.]+$)/)
          filename = `${base} (${n}).${ext}`
        } else {
          seen.set(filename, 1)
        }
        zip.file(filename, f.result.blob)
      })

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 }, // images are already compressed — fast pack only
      })

      const url = URL.createObjectURL(blob)
      triggerDownload(url, `${name}.zip`)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)

    } catch (err) {
      // Fallback: download individually if JSZip fails or isn't installed
      console.warn('[Bonsai] ZIP failed, falling back to individual downloads:', err)
      done.forEach(f => downloadOne(f))
    }
  }, [downloadOne])

  return { downloadOne, downloadAll, downloadZip }
}
