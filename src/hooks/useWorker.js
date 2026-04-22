// src/hooks/useWorker.js
// Bridges the UI to compression.worker.js.
// One worker is spawned per file — they run in parallel.
// Workers are tracked in a Map so they can be terminated individually or all at once.

import { useRef, useCallback } from 'react'
import { useCompressionStore } from '../store/compressionStore'

export function useWorker() {
  const workers    = useRef(new Map())        // fileId → Worker
  const updateFile = useCompressionStore(s => s.updateFile)

  const compress = useCallback((id, file, settings) => {
    // Kill any existing worker for this id (re-compress scenario)
    workers.current.get(id)?.terminate()

    const worker = new Worker(
      new URL('../workers/compression.worker.js', import.meta.url),
      { type: 'module' }
    )
    workers.current.set(id, worker)

    updateFile(id, { status: 'compressing', progress: 0, error: null })

    worker.onmessage = ({ data }) => {
      const { type, progress, result, error } = data

      if (type === 'progress') {
        updateFile(id, { progress })

      } else if (type === 'done') {
        const url = URL.createObjectURL(result.blob)
        updateFile(id, {
          status:   'done',
          progress: 100,
          result:   { ...result, url },
        })
        workers.current.delete(id)
        worker.terminate()

      } else if (type === 'error') {
        updateFile(id, { status: 'error', progress: 0, error })
        workers.current.delete(id)
        worker.terminate()
      }
    }

    worker.onerror = (e) => {
      updateFile(id, { status: 'error', progress: 0, error: e.message ?? 'Worker crashed' })
      workers.current.delete(id)
      worker.terminate()
    }

    worker.postMessage({ id, file, settings })
  }, [updateFile])

  /** Terminate a single worker without changing file status (user cancelled). */
  const cancel = useCallback((id) => {
    workers.current.get(id)?.terminate()
    workers.current.delete(id)
    updateFile(id, { status: 'idle', progress: 0 })
  }, [updateFile])

  /** Terminate all active workers — called on "Start over" or unmount. */
  const cancelAll = useCallback(() => {
    workers.current.forEach(w => w.terminate())
    workers.current.clear()
  }, [])

  /** True if any worker is still running. */
  const isRunning = useCallback(() => workers.current.size > 0, [])

  return { compress, cancel, cancelAll, isRunning }
}
