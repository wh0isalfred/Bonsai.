/**
 * src/hooks/useCompressionWorker.js
 *
 * Single owner of the compression.worker.js lifecycle.
 *
 * Both Smart and Pro mode spawn the same worker with the same message
 * protocol — the only difference is where the resulting state lives.
 * So this hook owns the Worker Map, the onmessage switch, and cleanup,
 * and hands every state change back through one `onUpdate(id, patch)`
 * callback. The caller decides what to do with the patch.
 *
 * Worker protocol (see compression.worker.js):
 *   in:  { id, file, settings }
 *   out: { id, type: 'progress' | 'done' | 'error', ... }
 *
 * Usage:
 *   const { compress, compressMany, cancel, cancelAll } = useCompressionWorker(patch)
 *   compress({ id, file, size }, settings)
 *
 * Workers are terminated on completion, on cancel, and on unmount.
 */
import { useCallback, useEffect, useRef } from 'react'

export function useCompressionWorker(onUpdate) {
  const workers = useRef(new Map())   // id → Worker

  /* Keep the latest callback in a ref so `compress` stays referentially
     stable even when the caller's onUpdate closure changes. */
  const cbRef = useRef(onUpdate)
  useEffect(() => { cbRef.current = onUpdate }, [onUpdate])

  /* ── Terminate one worker ───────────────────────────────────────── */
  const cancel = useCallback((id) => {
    const w = workers.current.get(id)
    if (!w) return
    w.terminate()
    workers.current.delete(id)
  }, [])

  /* ── Terminate everything ───────────────────────────────────────── */
  const cancelAll = useCallback(() => {
    workers.current.forEach(w => w.terminate())
    workers.current.clear()
  }, [])

  /* ── Kill all workers on unmount ────────────────────────────────── */
  useEffect(() => {
    const map = workers.current
    return () => {
      map.forEach(w => w.terminate())
      map.clear()
    }
  }, [])

  /* ── Compress one entry ─────────────────────────────────────────────
     entry: { id, file, size } — size is echoed back into result.originalSize
     so downstream savings maths doesn't need the original file entry. */
  const compress = useCallback((entry, settings) => {
    const { id, file, size } = entry

    /* Re-compress of an in-flight id: kill the old worker first */
    cancel(id)

    const worker = new Worker(
      new URL('../workers/compression.worker.js', import.meta.url),
      { type: 'module' }
    )
    workers.current.set(id, worker)

    const teardown = () => {
      workers.current.delete(id)
      worker.terminate()
    }

    worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'progress':
          cbRef.current(id, { progress: data.progress })
          break

        case 'done': {
          const url = URL.createObjectURL(data.result.blob)
          cbRef.current(id, {
            status:   'done',
            progress: 100,
            error:    null,
            result:   { ...data.result, url, originalSize: size },
          })
          teardown()
          break
        }

        case 'error':
          cbRef.current(id, {
            status:   'error',
            progress: 0,
            error:    data.error ?? 'Compression failed',
          })
          teardown()
          break
      }
    }

    worker.onerror = (e) => {
      cbRef.current(id, {
        status:   'error',
        progress: 0,
        error:    e.message ?? 'Worker crashed',
      })
      teardown()
    }

    /* Flip to compressing only once the worker actually exists */
    cbRef.current(id, { status: 'compressing', progress: 0, error: null })
    worker.postMessage({ id, file, settings })
  }, [cancel])

  /* ── Compress a batch in parallel (one worker per file) ─────────── */
  const compressMany = useCallback((entries, settings) => {
    entries.forEach(entry => compress(entry, settings))
  }, [compress])

  return { compress, compressMany, cancel, cancelAll }
}
