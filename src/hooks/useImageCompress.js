import { useCallback, useEffect } from 'react'
import { useCompressionStore } from '../store/compressionStore'
import { compressImage, previewAllPresets, validateFile, getImageInfo, encode } from './compressImage'
import { PRESETS } from '../config/presets'
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
    const settings = store.getSettingsForFile(id)
    const result   = await compressImage(entry.file, settings,
      (pct) => useCompressionStore.getState().updateFile(id, { progress: pct })
    )
    useCompressionStore.getState().updateFile(id, {
      status: 'done', progress: 100,
      result: { ...result, usedPreset: useCompressionStore.getState().preset },
    })
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

// Previews — when advanced is active, show the advanced settings preview
// for all cards (they'll all show the same number since it's one config)
// When preset mode, show per-preset numbers as usual.
async function runPreviews(file, generation) {
  const store = useCompressionStore.getState()

  PRESETS.forEach(p => store.updatePreview(p.id, { size: null, loading: true }))

  const { useAdvanced, advancedSettings } = store

  if (useAdvanced) {
    // Advanced mode — calculate once for the advanced config
    try {
      const { default: _ } = await Promise.resolve() // yield to UI
      const img      = await (async () => {
        const { loadImage, detectTransparency } = await getHelpers()
        const i = await loadImage(file)
        return { img: i, hasAlpha: detectTransparency(i) }
      })()
      // encode once with advanced settings
      const { blob } = await encode(img.img, file, advancedSettings, img.hasAlpha)
      const size = blob.size
      // Check still valid
      if (useCompressionStore.getState().previewGeneration !== generation) return
      // Show the same size on all preset cards with a note
      PRESETS.forEach(p => useCompressionStore.getState().updatePreview(p.id, { size, loading: false, isAdvanced: true }))
    } catch {
      PRESETS.forEach(p => useCompressionStore.getState().updatePreview(p.id, { size: null, loading: false }))
    }
  } else {
    // Preset mode — calculate per-preset
    const sizeMap = await previewAllPresets(file, PRESETS)
    if (useCompressionStore.getState().previewGeneration !== generation) return
    PRESETS.forEach(p => useCompressionStore.getState().updatePreview(p.id, {
      size: sizeMap[p.id] ?? null, loading: false, isAdvanced: false,
    }))
  }
}

// Lazy-load internal helpers from compressImage without circular dep
async function getHelpers() {
  const mod = await import('./compressImage')
  return mod
}

async function loadInfoForFiles(entries) {
  for (const entry of entries) {
    if (!entry.file) continue
    const info = await getImageInfo(entry.file)
    useCompressionStore.getState().setFileInfo(entry.id, info)
  }
}

export function useImageCompress() {
  const files              = useCompressionStore(s => s.files)
  const preset             = useCompressionStore(s => s.preset)
  const previews           = useCompressionStore(s => s.previews)
  const useAdvanced        = useCompressionStore(s => s.useAdvanced)
  const advancedSettings   = useCompressionStore(s => s.advancedSettings)
  const setPreset          = useCompressionStore(s => s.setPreset)
  const setAdvancedSettings = useCompressionStore(s => s.setAdvancedSettings)
  const resetAdvanced      = useCompressionStore(s => s.resetAdvancedSettings)
  const addFilesStore      = useCompressionStore(s => s.addFiles)
  const replaceFilesStore  = useCompressionStore(s => s.replaceFiles)
  const removeFile         = useCompressionStore(s => s.removeFile)
  const clearFiles         = useCompressionStore(s => s.clearFiles)
  const setFileOutputName  = useCompressionStore(s => s.setFileOutputName)
  const setFilePresetOverride = useCompressionStore(s => s.setFilePresetOverride)

  const buildEntries = useCallback((rawFiles) => {
    const entries = [], valid = []
    for (const file of rawFiles) {
      const { valid: ok, reason } = validateFile(file)
      const id    = nanoid()
      const entry = { id, file, name: file.name, size: file.size, type: file.type }
      if (!ok) { entry.status = 'error'; entry.error = reason }
      else valid.push(entry)
      entries.push(entry)
    }
    return { entries, valid }
  }, [])

  const kickPreviews = useCallback((validEntries) => {
    if (!validEntries.length) return
    loadInfoForFiles(validEntries)
    const gen = useCompressionStore.getState().previewGeneration
    runPreviews(validEntries[0].file, gen)
  }, [])

  const stageFiles = useCallback((rawFiles) => {
    if (!rawFiles.length) return
    const { entries, valid } = buildEntries(rawFiles)
    addFilesStore(entries)
    kickPreviews(valid)
  }, [buildEntries, addFilesStore, kickPreviews])

  const replaceWithFiles = useCallback((rawFiles) => {
    if (!rawFiles.length) return
    const { entries, valid } = buildEntries(rawFiles)
    replaceFilesStore(entries)
    kickPreviews(valid)
  }, [buildEntries, replaceFilesStore, kickPreviews])

  // When advanced settings change, re-run previews against new config
  const setAdvancedSettingsAndPreview = useCallback((patch) => {
    setAdvancedSettings(patch)
    const { files } = useCompressionStore.getState()
    const firstFile = files.find(f => f.file)
    if (firstFile) {
      const gen = useCompressionStore.getState().previewGeneration
      // Small debounce — avoid thrashing on slider drag
      clearTimeout(window.__bonsai_preview_timer)
      window.__bonsai_preview_timer = setTimeout(() => {
        runPreviews(firstFile.file, gen)
      }, 300)
    }
  }, [setAdvancedSettings])

  const recompressAll = useCallback(() => {
    useCompressionStore.getState().resetAllToIdle()
  }, [])

  const compressAll = useCallback(() => {
    const { files } = useCompressionStore.getState()
    const ids = files.filter(f => f.status === 'idle' || f.status === 'error').map(f => f.id)
    ids.forEach(id => {
      const f = useCompressionStore.getState().files.find(x => x.id === id)
      if (f?.status === 'error') useCompressionStore.getState().updateFile(id, { status: 'idle', error: null, progress: 0 })
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

  const downloadZip = useCallback(async () => {
    const done = useCompressionStore.getState().files.filter(f => f.status === 'done')
    if (!done.length) return
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      await Promise.all(done.map(async (f) => {
        const blob = await fetch(f.result.url).then(r => r.blob())
        zip.file(f.result.name, blob)
      }))
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      triggerDownload(URL.createObjectURL(zipBlob), 'bonsai_compressed.zip')
    } catch {
      done.forEach(f => triggerDownload(f.result.url, f.result.name))
    }
  }, [])

  const copyToClipboard = useCallback(async (id) => {
    const file = useCompressionStore.getState().files.find(f => f.id === id)
    if (!file?.result?.blob) return false
    try {
      await navigator.clipboard.write([new ClipboardItem({ [file.result.outputMime]: file.result.blob })])
      return true
    } catch { return false }
  }, [])

  // Page-level paste
  useEffect(() => {
    const handle = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile()
          if (f) stageFiles([new File([f], `pasted.${item.type.split('/')[1]}`, { type: item.type })])
          break
        }
      }
    }
    window.addEventListener('paste', handle)
    return () => window.removeEventListener('paste', handle)
  }, [stageFiles])

  // Page-level drag-drop
  useEffect(() => {
    const ov = (e) => e.preventDefault()
    const dr = (e) => {
      e.preventDefault()
      const fs = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      if (fs.length) stageFiles(fs)
    }
    window.addEventListener('dragover', ov)
    window.addEventListener('drop', dr)
    return () => { window.removeEventListener('dragover', ov); window.removeEventListener('drop', dr) }
  }, [stageFiles])

  // Keyboard shortcuts
  useEffect(() => {
    const handle = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        const { files } = useCompressionStore.getState()
        const ids = files.filter(f => f.status === 'idle').map(f => f.id)
        if (ids.length) enqueue(ids)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        useCompressionStore.getState().clearFiles()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  const hasIdle     = files.some(f => f.status === 'idle')
  const hasAnyDone  = files.some(f => f.status === 'done')
  const allSettled  = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const compressing = files.some(f => f.status === 'compressing')

  return {
    files, preset, previews, useAdvanced, advancedSettings,
    setPreset,
    setAdvancedSettings: setAdvancedSettingsAndPreview,
    resetAdvanced,
    stageFiles, replaceWithFiles,
    compressAll, recompressAll,
    removeFile, clearFiles,
    retryFile,
    downloadOne, downloadAll, downloadZip,
    copyToClipboard,
    setFileOutputName, setFilePresetOverride,
    hasIdle, hasAnyDone, allSettled, compressing,
  }
}

function triggerDownload(url, name) {
  fetch(url).then(r => r.blob()).then(blob => {
    const reader = new FileReader()
    reader.onload = () => {
      const a = document.createElement('a')
      a.href = reader.result; a.download = name
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }
    reader.readAsDataURL(blob)
  })
}
