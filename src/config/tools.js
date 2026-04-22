/**
 * src/config/tools.js
 *
 * SINGLE SOURCE OF TRUTH for every tool Bonsai will ever have.
 *
 * Adding a new tool (e.g. Video) requires only:
 *  1. Add an entry here
 *  2. Create src/features/tools/video/index.jsx
 *  3. Everything else (Toolbar, ToolPage, routing) picks it up automatically.
 *
 * status:
 *   'live'    → fully functional, shown as active
 *   'beta'    → functional but marked beta
 *   'soon'    → disabled tab, shows "Coming soon" tooltip
 *   'planned' → hidden from toolbar until status changes
 */

export const TOOLS = [
  {
    id:          'image',
    label:       'Image',
    description: 'Compress JPEG, PNG, WebP, AVIF',
    status:      'live',
    // Accepted MIME types for this tool's dropzone
    accept:      ['image/jpeg','image/png','image/webp','image/avif','image/gif'],
    acceptStr:   '.jpg,.jpeg,.png,.webp,.avif,.gif,image/*',
    maxFileMB:   50,
    smartLimit:  15,   // max files per Smart mode batch
    // Icon path within the SVG sprite (defined inline in Toolbar.jsx)
    iconName:    'image',
  },
  {
    id:          'video',
    label:       'Video',
    description: 'Compress MP4, MOV, WebM',
    status:      'soon',
    accept:      ['video/mp4','video/quicktime','video/webm','video/x-matroska'],
    acceptStr:   '.mp4,.mov,.webm,.mkv,video/*',
    maxFileMB:   500,
    smartLimit:  5,
    iconName:    'video',
  },
  {
    id:          'audio',
    label:       'Audio',
    description: 'Compress MP3, WAV, AAC, FLAC',
    status:      'soon',
    accept:      ['audio/mpeg','audio/wav','audio/aac','audio/flac','audio/ogg'],
    acceptStr:   '.mp3,.wav,.aac,.flac,.ogg,audio/*',
    maxFileMB:   100,
    smartLimit:  20,
    iconName:    'audio',
  },
  {
    id:          'file',
    label:       'File',
    description: 'Compress PDFs and documents',
    status:      'soon',
    accept:      ['application/pdf','application/zip'],
    acceptStr:   '.pdf,.doc,.docx,.zip',
    maxFileMB:   100,
    smartLimit:  10,
    iconName:    'file',
  },
  {
    id:          'code',
    label:       'Code',
    description: 'Minify JS, CSS, HTML',
    status:      'soon',
    accept:      ['text/javascript','text/css','text/html'],
    acceptStr:   '.js,.ts,.jsx,.tsx,.css,.html',
    maxFileMB:   10,
    smartLimit:  30,
    iconName:    'code',
  },
]

/**
 * Tools shown in the "More tools" dropdown.
 * These graduate to TOOLS[] when they reach 'soon' or 'live'.
 */
export const MORE_TOOLS = [
  {
    id:          'convert',
    label:       'Convert',
    description: 'PNG → JPG, WebP → AVIF…',
    status:      'soon',
    iconName:    'convert',
  },
  {
    id:          'watermark',
    label:       'Watermark',
    description: 'Text or image overlay',
    status:      'soon',
    iconName:    'watermark',
  },
  {
    id:          'ai-detect',
    label:       'AI Detection',
    description: 'Detect AI-generated content',
    status:      'soon',
    iconName:    'ai',
  },
  {
    id:          'metadata',
    label:       'Metadata',
    description: 'View & strip EXIF data',
    status:      'soon',
    iconName:    'metadata',
  },
]

/** Helpers */
export const getToolById      = (id) => TOOLS.find(t => t.id === id) ?? null
export const getLiveTool      = ()   => TOOLS.find(t => t.status === 'live') ?? TOOLS[0]
export const isToolLive       = (id) => getToolById(id)?.status === 'live'
