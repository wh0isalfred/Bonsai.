/**
 * src/lib/exportPolicy.js
 *
 * THE single answer to two questions:
 *   1. Is this user allowed to export at all?
 *   2. Does their output get a watermark?
 *
 * Every download path in the app must ask this function. It is the reason
 * a gate can't leak: previously the check lived inside DoneBar's onClick,
 * so ProQueue's per-card download button and useAutoDownload both walked
 * straight past it. Gates attached to buttons always leak — a gate has to
 * sit on the path.
 *
 * ── Policy (tier B: Pro Mode export is a Pro-plan feature) ─────────────
 *
 *   Smart mode                 → always exportable
 *     free                     → watermarked
 *     supporter / pro          → clean
 *
 *   Pro mode                   → the editor is free to USE; export is gated
 *     pro                      → clean
 *     supporter                → clean  (paid is paid)
 *     free + trial remaining   → clean, consumes the one-time trial
 *     free, no trial           → BLOCKED
 *
 * Free users are never both watermarked AND blocked — that's punishing the
 * same person twice for the same thing. In Pro mode the block IS the gate,
 * so no mark is applied; in Smart mode the mark IS the gate, so nothing is
 * blocked.
 *
 * To switch to tier A ("watermark is the only line, nothing is ever
 * blocked"), change the `allowed: false` branch below to
 * `{ allowed: true, watermark: true }` and delete the trial logic.
 * That is the only edit required — no component knows the rules.
 */

export const EXPORT_ALLOWED  = 'allowed'
export const EXPORT_TRIAL    = 'trial'      // allowed, but burns the free trial
export const EXPORT_BLOCKED  = 'blocked'

/**
 * @param {object}  ctx
 * @param {string}  ctx.plan      'free' | 'supporter' | 'pro'
 * @param {string}  ctx.mode      'smart' | 'pro'
 * @param {boolean} ctx.hasTrial  free user still holds their one Pro export
 * @returns {{ status: string, watermark: boolean, reason: string|null }}
 */
export function resolveExport({ plan, mode, hasTrial }) {
  const isPro   = plan === 'pro'
  const isPaid  = isPro || plan === 'supporter'

  /* ── Smart mode: never blocked. The mark is the boundary. ────────── */
  if (mode !== 'pro') {
    return {
      status:    EXPORT_ALLOWED,
      watermark: !isPaid,
      reason:    null,
    }
  }

  /* ── Pro mode: the block is the boundary, so no mark. ────────────── */
  if (isPaid) {
    return { status: EXPORT_ALLOWED, watermark: false, reason: null }
  }

  if (hasTrial) {
    return { status: EXPORT_TRIAL, watermark: false, reason: null }
  }

  return {
    status:    EXPORT_BLOCKED,
    watermark: false,
    reason:    'Pro Mode exports require Pro.',
  }
}
