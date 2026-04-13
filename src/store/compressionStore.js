import { create } from 'zustand'
import { PRESETS } from '../config/presets'

export const useCompressionStore = create((set, get) => ({
  files:             [],
  preset:            'high',
  previews:          {},
  previewGeneration: 0,

  addFiles: (newFiles) => set((state) => {
    state.files.forEach(f => { if (f.result?.url) URL.revokeObjectURL(f.result.url) })
    const toAdd = newFiles.map(f => ({
      ...f, status: 'idle', progress: 0, result: null, error: null,
    }))
    return {
      files:             toAdd,
      previews:          {},
      previewGeneration: state.previewGeneration + 1,
    }
  }),

  updatePreview: (presetId, patch) => set((state) => ({
    previews: {
      ...state.previews,
      [presetId]: { ...state.previews[presetId], ...patch },
    },
  })),

  removeFile: (id) => set((state) => {
    const file = state.files.find(f => f.id === id)
    if (file?.result?.url) URL.revokeObjectURL(file.result.url)
    return { files: state.files.filter(f => f.id !== id) }
  }),

  // Uses set() with state parameter — avoids calling get() outside of set
  clearFiles: () => set((state) => {
    state.files.forEach(f => { if (f.result?.url) URL.revokeObjectURL(f.result.url) })
    return { files: [], previews: {}, previewGeneration: state.previewGeneration + 1 }
  }),

  updateFile: (id, patch) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, ...patch } : f),
  })),

  setPreset: (id) => set({ preset: id }),

  resetAllToIdle: () => set((state) => {
    state.files.forEach(f => { if (f.result?.url) URL.revokeObjectURL(f.result.url) })
    return {
      files: state.files.map(f => ({
        ...f, status: 'idle', progress: 0, result: null, error: null,
      })),
      // previews intentionally kept — image hasn't changed
    }
  }),

  getActiveSettings: () => {
    const { preset } = get()
    return PRESETS.find(p => p.id === preset)?.settings ?? PRESETS[1].settings
  },
}))

export const selectTotalOriginal   = (s) => s.files.reduce((acc, f) => acc + (f.size ?? 0), 0)
export const selectTotalCompressed = (s) => s.files
  .filter(f => f.status === 'done')
  .reduce((acc, f) => acc + (f.result?.compressedSize ?? 0), 0)
