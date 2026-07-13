/**
 * src/components/ui/UpgradeHint.jsx
 *
 * The ONLY upgrade prompt surface in the app. Inline, quiet, dismissible.
 *
 * Rules this component exists to enforce:
 *   - Never a modal. Modals interrupt; interruption before value = churn.
 *   - Never on page load. The user has felt nothing yet.
 *   - Dismissal sticks for the session. One "no" is enough.
 *   - Shows the value the user ALREADY GOT, then asks. Never the reverse.
 *
 * Variants:
 *   'note'   — pre-compression expectation-setting. No CTA pressure.
 *              Just tells the truth about the watermark before they commit.
 *   'result' — post-compression. The only real "ask" in the product.
 */
import { useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'

export default function UpgradeHint({
  variant = 'result',
  savedPct,
  onUpgrade,
  storageKey,
}) {
  const plan   = useAuthStore(s => s.plan)
  const isPaid = plan === 'pro' || plan === 'supporter'

  /* Session-scoped dismissal. Deliberately NOT localStorage — a hint the
     user never sees again across sessions is a hint that can't convert,
     and one line per session is not harassment. */
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey) return false
    try { return sessionStorage.getItem(storageKey) === '1' } catch { return false }
  })

  const dismiss = () => {
    setDismissed(true)
    if (!storageKey) return
    try { sessionStorage.setItem(storageKey, '1') } catch { /* private mode */ }
  }

  /* Paid users never see any of this. */
  if (isPaid || dismissed) return null

  /* ── Pre-compression: expectation-setting, not selling ──────────── */
  if (variant === 'note') {
    return (
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        padding:      '7px 11px',
        borderRadius: 'var(--r-sm)',
        background:   'var(--surface-2)',
        border:       '1px solid var(--border)',
      }}>
        <MarkIcon />
        <p style={{ fontSize: '.71rem', color: 'var(--t-tertiary)', margin: 0, flex: 1 }}>
          Free exports carry a small Bonsai mark in the corner.
        </p>
        <button
          onClick={onUpgrade}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '.71rem',
            fontWeight: 600, color: 'var(--c)', padding: 0,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          Remove it
        </button>
      </div>
    )
  }

  /* ── Post-compression: the ask, anchored to what they just got ──── */
  return (
    <div
      className="card-enter"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '10px 12px',
        borderRadius: 'var(--r-md)',
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
      }}>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '.76rem', color: 'var(--t-secondary)', margin: 0, lineHeight: 1.5 }}>
          {savedPct > 0 && (
            <>
              <strong style={{ color: 'var(--t-primary)' }}>
                Nice — {savedPct}% smaller.
              </strong>{' '}
            </>
          )}
          Your files are watermarked on the free plan.
        </p>
      </div>

      <button
        onClick={onUpgrade}
        className="btn btn-primary btn-sm"
        style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
        Remove watermark
      </button>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        title="Not now"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--t-tertiary)', padding: 4, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          borderRadius: 4, transition: 'color var(--t-fast)',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--t-secondary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--t-tertiary)'}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
             stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M1 1l9 9M10 1L1 10"/>
        </svg>
      </button>
    </div>
  )
}

const MarkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
       stroke="var(--t-tertiary)" strokeWidth="1.4" strokeLinecap="round"
       style={{ flexShrink: 0 }}>
    <rect x="1.5" y="1.5" width="11" height="11" rx="2"/>
    <path d="M8.5 10.5h2"/>
  </svg>
)
