/**
 * src/features/tools/image/index.jsx
 *
 * Image tool entry point.
 *
 * Gate strategy:
 *   - Pro MODE (editor UI) → everyone can use it — that's how you convert
 *   - Pro DOWNLOAD → free users get 1 trial export, then see upgrade prompt
 *   - Free EXPORTS → watermarked (see config/presets.js → withPlanWatermark)
 *
 * Anyone can drop images, edit settings, and see the live preview. The
 * paywall only appears at the moment they try to download — after they've
 * already experienced the value.
 *
 * Both modes now receive `onAuth` — Smart mode needs it too, because that's
 * where the watermark hint lives and it has to be able to open the modal.
 */
import { useModeStore } from '../../../store/useModeStore'
import SmartCompressor  from './smart/SmartCompressor'
import ProEditor        from './pro/ProEditor'

export default function ImageTool({ onAuth }) {
  const mode = useModeStore(s => s.mode)

  if (mode === 'pro') return <ProEditor onAuth={onAuth} />
  return <SmartCompressor onAuth={onAuth} />
}
