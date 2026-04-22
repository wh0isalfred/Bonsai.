// src/hooks/useAutoDownload.js
// Watches files and fires a download for each one the moment it reaches 'done'.
// Only active when `enabled` is true (auto-download toggle).

import { useEffect, useRef } from 'react'
import { useDownloads } from './useDownloads'

/**
 * @param {object[]} files   - file entries from the compression store
 * @param {boolean}  enabled - whether auto-download is active
 */
export function useAutoDownload(files, enabled) {
  const { downloadOne } = useDownloads()
  const firedIds = useRef(new Set())

  // Reset when the file list is cleared (new session)
  useEffect(() => {
    if (files.length === 0) firedIds.current.clear()
  }, [files.length])

  useEffect(() => {
    if (!enabled) return

    files.forEach(file => {
      if (
        file.status === 'done' &&
        file.result?.url &&
        !firedIds.current.has(file.id)
      ) {
        firedIds.current.add(file.id)
        // Tiny delay so the UI settles before the browser's save dialog appears
        setTimeout(() => downloadOne(file), 120)
      }
    })
  }, [files, enabled, downloadOne])
}
