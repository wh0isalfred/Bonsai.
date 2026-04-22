/**
 * src/features/tools/image/index.jsx
 *
 * Image tool entry point.
 *
 * Gate strategy:
 *   - Pro MODE (editor UI) → everyone can use it — that's how you convert
 *   - Pro DOWNLOAD → free users get 1 trial export, then see upgrade prompt
 *
 * This means anyone can drop images, edit settings, and see the live preview.
 * The paywall only appears at the moment they try to download — after they've
 * already experienced the value.
 */
import { useModeStore } from '../../../store/useModeStore'
import SmartCompressor  from './smart/SmartCompressor'
import ProEditor        from './pro/ProEditor'

export default function ImageTool({ onAuth }) {
  const mode = useModeStore(s => s.mode)

  if (mode === 'pro') return <ProEditor onAuth={onAuth} />
  return <SmartCompressor />
}
