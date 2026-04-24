/**
 * src/lib/historyDB.js
 *
 * IndexedDB wrapper for persisting compressed file blobs across sessions.
 * localStorage can't store binary data at scale — IndexedDB handles hundreds of MB.
 *
 * Schema:
 *   DB:    bonsai_history
 *   Store: blobs
 *   Key:   `${batchId}:${index}` (string)
 *   Value: { blob: Blob, name: string, outputMime: string }
 */

const DB_NAME    = 'bonsai_history'
const DB_VERSION = 1
const STORE_NAME = 'blobs'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

/** Store all blobs for a batch */
export async function saveBatchBlobs(batchId, files) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    files.forEach((f, i) => {
      if (f.result?.blob) {
        store.put({
          blob:       f.result.blob,
          name:       f.name,
          outputMime: f.result.outputMime ?? 'image/webp',
        }, `${batchId}:${i}`)
      }
    })

    tx.oncomplete = () => resolve()
    tx.onerror    = e => reject(e.target.error)
  })
}

/** Retrieve all blobs for a batch */
export async function getBatchBlobs(batchId, fileCount) {
  const db = await openDB()
  const results = []

  for (let i = 0; i < fileCount; i++) {
    const entry = await new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly')
      const req   = tx.objectStore(STORE_NAME).get(`${batchId}:${i}`)
      req.onsuccess = e => resolve(e.target.result ?? null)
      req.onerror   = e => reject(e.target.error)
    })
    if (entry) results.push(entry)
  }

  return results
}

/** Delete all blobs for a batch */
export async function deleteBatchBlobs(batchId, fileCount) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (let i = 0; i < fileCount; i++) {
      store.delete(`${batchId}:${i}`)
    }
    tx.oncomplete = () => resolve()
    tx.onerror    = e => reject(e.target.error)
  })
}

/** Nuke the entire blob store (clear history) */
export async function clearAllBlobs() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror    = e => reject(e.target.error)
  })
}

/** Delete blobs for multiple batch IDs at once */
export async function deleteManyBatchBlobs(entries) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    entries.forEach(({ batchId, fileCount }) => {
      for (let i = 0; i < fileCount; i++) store.delete(`${batchId}:${i}`)
    })
    tx.oncomplete = () => resolve()
    tx.onerror    = e => reject(e.target.error)
  })
}
