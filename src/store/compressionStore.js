import { create } from 'zustand'
import { PRESETS, DEFAULT_ADVANCED } from '../config/presets'

export const useCompressionStore = create((set, get) => ({
  files:             [],
  preset:            'high',
  advancedSettings:  { ...DEFAULT_ADVANCED },
  useAdvanced:       false,
  previews:          {},
  previewGeneration: 0,

  // ── File management ──────────────────────────────────────────────────────────

  addFiles: (newFiles) => set((state) => {
    const existing = new Set(state.files.map(f => `${f.name}:${f.size}`))
    const toAdd = newFiles
      .filter(f => !existing.has(`${f.name}:${f.size}`))
      .map(f => ({ ...f, status: 'idle', progress: 0, result: null, error: null, outputName: null, presetOverride: null, info: null }))
    const isFirstBatch = state.files.length === 0
    return {
      files:             [...state.files, ...toAdd],
      previews:          isFirstBatch ? {} : state.previews,
      previewGeneration: isFirstBatch ? state.previewGeneration + 1 : state.previewGeneration,
    }
  }),

  replaceFiles: (newFiles) => set((state) => {
    state.files.forEach(f => { if (f.result?.url) URL.revokeObjectURL(f.result.url) })
    const toAdd = newFiles.map(f => ({ ...f, status: 'idle', progress: 0, result: null, error: null, outputName: null, presetOverride: null, info: null }))
    return { files: toAdd, previews: {}, previewGeneration: state.previewGeneration + 1 }
  }),

  removeFile: (id) => set((state) => {
    const file = state.files.find(f => f.id === id)
    if (file?.result?.url) URL.revokeObjectURL(file.result.url)
    return { files: state.files.filter(f => f.id !== id) }
  }),

  clearFiles: () => set((state) => {
    state.files.forEach(f => { if (f.result?.url) URL.revokeObjectURL(f.result.url) })
    return { files: [], previews: {}, previewGeneration: state.previewGeneration + 1 }
  }),

  updateFile: (id, patch) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, ...patch } : f),
  })),

  setFileOutputName: (id, name) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, outputName: name.trim() || null } : f),
  })),

  setFilePresetOverride: (id, presetId) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, presetOverride: presetId } : f),
  })),

  setFileInfo: (id, info) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, info } : f),
  })),

  resetAllToIdle: () => set((state) => {
    state.files.forEach(f => { if (f.result?.url) URL.revokeObjectURL(f.result.url) })
    return { files: state.files.map(f => ({ ...f, status: 'idle', progress: 0, result: null, error: null })) }
  }),

  // ── Settings ─────────────────────────────────────────────────────────────────

  setPreset: (id) => set({ preset: id, useAdvanced: false }),

  setAdvancedSettings: (patch) => set((state) => ({
    advancedSettings: { ...state.advancedSettings, ...patch },
    useAdvanced: true,
  })),

  resetAdvancedSettings: () => set({ advancedSettings: { ...DEFAULT_ADVANCED }, useAdvanced: false }),

  // ── Previews ──────────────────────────────────────────────────────────────────

  updatePreview: (presetId, patch) => set((state) => ({
    previews: { ...state.previews, [presetId]: { ...state.previews[presetId], ...patch } },
  })),

  // ── Resolve settings for a specific file ────────────────────────────────────
  // Per-file preset override > global advanced panel > global preset
  getSettingsForFile: (fileId) => {
    const { files, preset, useAdvanced, advancedSettings } = get()
    const file = files.find(f => f.id === fileId)
    if (!file) return { ...advancedSettings }

    let baseSettings
    if (file.presetOverride) {
      // Per-file override always wins
      baseSettings = PRESETS.find(p => p.id === file.presetOverride)?.settings ?? PRESETS[1].settings
    } else if (useAdvanced) {
      // Advanced panel active — use its settings
      baseSettings = advancedSettings
    } else {
      // Global preset
      baseSettings = PRESETS.find(p => p.id === preset)?.settings ?? PRESETS[1].settings
    }

    // Always merge outputName so rename works regardless of settings source
    return { ...baseSettings, outputName: file.outputName ?? null }
  },
}))

export const selectTotalOriginal   = (s) => s.files.reduce((acc, f) => acc + (f.size ?? 0), 0)
export const selectTotalCompressed = (s) => s.files
  .filter(f => f.status === 'done')
  .reduce((acc, f) => acc + (f.result?.compressedSize ?? 0), 0)
