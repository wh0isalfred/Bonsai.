import { create } from 'zustand'
import { PRESETS } from '../config/presets'

export const useCompressionStore = create((set, get) => ({
  files:    [],
  preset:   'high',   // active preset id

  addFiles: (newFiles) => set((state) => {
    const existing = new Set(state.files.map(f => f.id))
    const toAdd = newFiles
      .filter(f => !existing.has(f.id))
      .map(f => ({ ...f, status: 'idle', progress: 0, result: null, error: null }))
    return {files: toAdd}
  }),

  removeFile: (id) => set((state) => {
    const file = state.files.find(f => f.id === id)
    if (file?.result?.url) URL.revokeObjectURL(file.result.url)
    return { files: state.files.filter(f => f.id !== id) }
  }),

  clearFiles: () => {
    get().files.forEach(f => { if (f.result?.url) URL.revokeObjectURL(f.result.url) })
    set({ files: [], })
  },

  updateFile: (id, patch) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, ...patch } : f)
  })),

  setPreset: (id) => set({ preset: id }),

  getActiveSettings: () => {
    const { preset } = get()
    return PRESETS.find(p => p.id === preset)?.settings ?? PRESETS[1].settings
  },
}))

export const selectTotalOriginal   = (s) => s.files.reduce((acc, f) => acc + (f.size ?? 0), 0)
export const selectTotalCompressed = (s) => s.files.filter(f => f.status === 'done').reduce((acc, f) => acc + (f.result?.compressedSize ?? 0), 0)
export const selectAllDone         = (s) => s.files.length > 0 && s.files.every(f => f.status === 'done' || f.status === 'error')
