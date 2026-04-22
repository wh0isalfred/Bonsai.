export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function savingsPercent(original, compressed) {
  if (!original || original === 0) return 0
  return Math.round(((original - compressed) / original) * 100)
}
