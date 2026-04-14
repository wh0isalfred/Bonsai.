import React from 'react'

function ImageTabIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="12" height="12" rx="2.5" />
      <circle cx="4.5" cy="4.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M1 10 L4 7 L6.5 9.5 L9 7.5 L13 10" />
    </svg>
  )
}

function VideoTabIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2.5" width="9" height="9" rx="2" />
      <path d="M10 5.5 L13 4 L13 10 L10 8.5" />
    </svg>
  )
}

function AudioTabIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M2 5v4M5 3v8M8 5v4M11 2v10" />
    </svg>
  )
}

function CodeTabIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4 L1 7 L4 10" />
      <path d="M10 4 L13 7 L10 10" />
      <path d="M8.5 2 L5.5 12" />
    </svg>
  )
}

function FilesTabIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 1h5l3 3v9H3V1z" />
      <path d="M8 1v3h3" />
    </svg>
  )
}

/* ✅ SAFE ICON MAP (prevents runtime issues) */
export const TABS = [
  { id: 'images', label: 'Images', ready: true,  icon: ImageTabIcon  },
  { id: 'video',  label: 'Video',  ready: false, icon: VideoTabIcon  },
  { id: 'audio',  label: 'Audio',  ready: false, icon: AudioTabIcon  },
  { id: 'code',   label: 'Code',   ready: false, icon: CodeTabIcon   },
  { id: 'files',  label: 'Files',  ready: false, icon: FilesTabIcon  },
]