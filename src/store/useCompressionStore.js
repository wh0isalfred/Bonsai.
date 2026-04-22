// src/store/useCompressionStore.js
// Re-exports the canonical store from compressionStore.js and layers
// beforeUrl management on top. Replace all imports of compressionStore
// with this file going forward.

import { useCompressionStore as _base, selectTotalOriginal, selectTotalCompressed } from './compressionStore'

// Patch addFiles to also create a beforeUrl (object URL for original preview)
// and removeFile / clearFiles to revoke them.
const original = _base.getState

_base.setState(state => {
  const _addFiles    = state.addFiles
  const _removeFile  = state.removeFile
  const _clearFiles  = state.clearFiles
  const _replaceFiles = state.replaceFiles

  return {
    addFiles: (newFiles, settings) => {
      const withUrls = newFiles.map(f => ({
        ...f,
        beforeUrl: f.beforeUrl ?? URL.createObjectURL(f),
      }))
      _addFiles(withUrls, settings)
    },

    removeFile: (id) => {
      const file = _base.getState().files.find(f => f.id === id)
      if (file?.beforeUrl) URL.revokeObjectURL(file.beforeUrl)
      _removeFile(id)
    },

    clearFiles: () => {
      _base.getState().files.forEach(f => {
        if (f.beforeUrl) URL.revokeObjectURL(f.beforeUrl)
      })
      _clearFiles()
    },

    replaceFiles: (newFiles) => {
      _base.getState().files.forEach(f => {
        if (f.beforeUrl) URL.revokeObjectURL(f.beforeUrl)
      })
      const withUrls = newFiles.map(f => ({
        ...f,
        beforeUrl: f.beforeUrl ?? URL.createObjectURL(f),
      }))
      _replaceFiles(withUrls)
    },
  }
})

export const useCompressionStore = _base
export { selectTotalOriginal, selectTotalCompressed }
