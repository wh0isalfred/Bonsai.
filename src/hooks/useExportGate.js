/**
 * src/hooks/useExportGate.js
 *
 * The chokepoint. Every export in the app goes through `guard()`.
 *
 * Usage — wrap the action, don't check-then-call:
 *
 *   const { guard, canExport, watermark } = useExportGate(onAuth)
 *   <button onClick={guard(() => downloadOne(file))}>Download</button>
 *
 * `guard(fn)` returns a new function that runs `fn` only if policy allows,
 * consuming the trial if that's what permitted it, and opening the upgrade
 * modal otherwise. A caller cannot forget to check, because there is no way
 * to call the action except through the guard.
 */
import { useCallback } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useModeStore } from '../store/useModeStore'
import {
  resolveExport,
  EXPORT_BLOCKED,
  EXPORT_TRIAL,
} from '../lib/exportPolicy'

export function useExportGate(onAuth) {
  const plan = useAuthStore(s => s.plan)
  const mode = useModeStore(s => s.mode)

  const hasTrialExport = useModeStore(s => s.hasTrialExport)
  const useTrial       = useModeStore(s => s.useTrial)

  const hasTrial = hasTrialExport()
  const decision = resolveExport({ plan, mode, hasTrial })

  /**
   * Wrap any export action. Returns a click-handler-shaped function.
   */
  const guard = useCallback((action) => (...args) => {
    /* Re-resolve at call time. The user may have upgraded in another tab,
       or burned their trial on a different button, since render. */
    const live = resolveExport({
      plan,
      mode,
      hasTrial: hasTrialExport(),
    })

    if (live.status === EXPORT_BLOCKED) {
      onAuth?.('upgrade')
      return false
    }

    if (live.status === EXPORT_TRIAL) {
      useTrial()
    }

    action(...args)
    return true
  }, [plan, mode, hasTrialExport, useTrial, onAuth])

  return {
    guard,
    /* For rendering — labels, lock icons, "1 free export left" copy. */
    canExport:    decision.status !== EXPORT_BLOCKED,
    isTrialUse:   decision.status === EXPORT_TRIAL,
    watermark:    decision.watermark,
    blockReason:  decision.reason,
  }
}
