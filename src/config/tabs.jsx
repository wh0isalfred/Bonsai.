import {
  ImageTabIcon,
  VideoTabIcon,
  AudioTabIcon,
  CodeTabIcon,
  FilesTabIcon
} from './icon'

export const TABS = [
  { id: 'images', label: 'Images', ready: true, icon: ImageTabIcon },
  { id: 'video', label: 'Video', ready: false, icon: VideoTabIcon },
  { id: 'audio', label: 'Audio', ready: false, icon: AudioTabIcon },
  { id: 'code', label: 'Code', ready: false, icon: CodeTabIcon },
  { id: 'files', label: 'Files', ready: false, icon: FilesTabIcon },
]