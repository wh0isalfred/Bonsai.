import { useCallback } from 'react'
import { useCompressionStore } from '../store/compressionStore'
import { compressImage, validateFile } from './compressImage'
import { nanoid } from 'nanoid'

const CONCURRENCY = 3
let _running = 0
const _queue  = []

async function processNext() {
  if (_running >= CONCURRENCY || _queue.length === 0) return
  const id = _queue.shift()
  _running++

  const store = useCompressionStore.getState()
  const entry = store.files.find(f => f.id === id)

  if (!entry) { _running--; processNext(); return }

  store.updateFile(id, { status: 'compressing', progress: 0 })

  try {
    // Always read settings fresh at compression time
    const settings = useCompressionStore.getState().getActiveSettings()
    const result   = await compressImage(
      entry.file,
      settings,
      (pct) => useCompressionStore.getState().updateFile(id, { progress: pct })
    )
    useCompressionStore.getState().updateFile(id, { status: 'done', progress: 100, result })
  } catch (err) {
    useCompressionStore.getState().updateFile(id, { status: 'error', error: err.message })
  } finally {
    _running--
    processNext()
  }
}

function enqueue(ids) {
  _queue.push(...ids)
  for (let i = 0; i < CONCURRENCY; i++) processNext()
}

export function useImageCompress() {
  const files      = useCompressionStore(s => s.files)
  const preset     = useCompressionStore(s => s.preset)
  const setPreset  = useCompressionStore(s => s.setPreset)
  const addFiles   = useCompressionStore(s => s.addFiles)
  const removeFile = useCompressionStore(s => s.removeFile)
  const clearFiles = useCompressionStore(s => s.clearFiles)

  // Stage files without compressing — user picks preset first
  const stageFiles = useCallback((rawFiles) => {
    const entries = []
    for (const file of rawFiles) {
      const { valid, reason } = validateFile(file)
      const id    = nanoid()
      const entry = { id, file, name: file.name, size: file.size, type: file.type }
      if (!valid) { entry.status = 'error'; entry.error = reason }
      entries.push(entry)
    }
    addFiles(entries)
  }, [addFiles])

  // Compress all staged idle files with current preset
  const compressAll = useCallback(() => {
    const { files } = useCompressionStore.getState()
    const ids = files
      .filter(f => f.status === 'idle' || f.status === 'error')
      .map(f => f.id)
    // Reset errors to idle before re-queuing
    ids.forEach(id => {
      const f = useCompressionStore.getState().files.find(x => x.id === id)
      if (f?.status === 'error') {
        useCompressionStore.getState().updateFile(id, { status: 'idle', error: null })
      }
    })
    if (ids.length) enqueue(ids)
  }, [])

  const retryFile = useCallback((id) => {
    useCompressionStore.getState().updateFile(id, { status: 'idle', progress: 0, result: null, error: null })
    enqueue([id])
  }, [])

  const downloadOne = useCallback((id) => {
    const file = useCompressionStore.getState().files.find(f => f.id === id)
    if (!file?.result?.url) return
    triggerDownload(file.result.url, file.result.name)
  }, [])

  const downloadAll = useCallback(() => {
    useCompressionStore.getState().files
      .filter(f => f.status === 'done')
      .forEach(f => triggerDownload(f.result.url, f.result.name))
  }, [])

  const hasIdle = files.some(f => f.status === 'idle')
  const hasAnyDone = files.some(f => f.status === 'done')
  const allSettled = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')

  return {
    files,
    preset,
    setPreset,
    stageFiles,
    compressAll,
    removeFile,
    clearFiles,
    retryFile,
    downloadOne,
    downloadAll,
    hasIdle,
    hasAnyDone,
    allSettled,
  }
}

function triggerDownload(url, name) {
  fetch(url)
    .then(r => r.blob())
    .then(blob => {
      const reader = new FileReader()
      reader.onload = () => {
        const a = document.createElement('a')
        a.href     = reader.result
        a.download = name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      reader.readAsDataURL(blob)
    })
}
