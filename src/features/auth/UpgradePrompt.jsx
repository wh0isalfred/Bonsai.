// src/features/auth/UpgradePrompt.jsx
// Inline upgrade nudge shown inside Pro-gated surfaces.
import { useState } from 'react'
import AuthModal from './AuthModal'

const FEATURES = [
  'Per-image quality, blur, sharpen, resize controls',
  'Live before/after preview while editing',
  'Unlimited images — compress while editing others',
  'Auto-download on completion',
  'Permanent compression history',
]

export default function UpgradePrompt({ feature }) {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <div style={{
        padding:      '2rem 1.75rem',
        background:   'var(--c-cream)',
        border:       '1px solid var(--c-clay)',
        borderRadius: 'var(--r-xl)',
        textAlign:    'center',
        boxShadow:    'var(--shadow-sm)',
      }}>
        {/* Bonsai tree illustration */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <svg width="52" height="60" viewBox="0 0 52 60" fill="none" aria-hidden="true">
            <path d="M26 52 C25 44 27 36 26 30 C25 25 23 20 26 17" stroke="#7A5F48" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M25 40 C20 36 14 34 10 29" stroke="#7A5F48" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            <path d="M26 36 C31 32 37 30 41 25" stroke="#7A5F48" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            <ellipse cx="26" cy="11" rx="14" ry="11" fill="#4BB872" opacity=".2"/>
            <ellipse cx="26" cy="11" rx="10" ry="7.5" fill="#27583C" opacity=".35"/>
            <ellipse cx="10" cy="26" rx="9" ry="7" fill="#4BB872" opacity=".22"/>
            <ellipse cx="10" cy="26" rx="6" ry="4.5" fill="#27583C" opacity=".32"/>
            <ellipse cx="41" cy="22" rx="9" ry="7" fill="#4BB872" opacity=".22"/>
            <ellipse cx="41" cy="22" rx="6" ry="4.5" fill="#27583C" opacity=".32"/>
            <ellipse cx="25" cy="3"  rx="7" ry="5.5" fill="#4BB872" opacity=".4"/>
            <path d="M20 56 L32 56 L28 60 L24 60 Z" fill="#7A5F48" opacity=".5"/>
            <rect x="17" y="53" width="18" height="4" rx="1.5" fill="#8B6F56" opacity=".4"/>
          </svg>
        </div>

        <p style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.12em',
                    textTransform: 'uppercase', color: 'var(--c-canopy)', marginBottom: '.4rem' }}>
          Pro feature
        </p>
        <h3 style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: '1.2rem',
                     letterSpacing: '-.025em', color: 'var(--c-ink)', margin: '0 0 .5rem' }}>
          {feature} requires Pro
        </h3>
        <p style={{ fontSize: '.8rem', color: 'var(--c-text-2)', margin: '0 0 1.25rem',
                    lineHeight: 1.55 }}>
          Take full manual control of every compression. Adjust and preview each image individually.
        </p>

        {/* Feature list */}
        <ul style={{ listStyle: 'none', margin: '0 0 1.5rem', padding: 0,
                     display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
          {FEATURES.map(f => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: '.77rem',
                                 color: 'var(--c-text)' }}>
              <span style={{ color: 'var(--c-canopy)', flexShrink: 0, marginTop: 1, fontSize: '.7rem' }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              fontFamily: 'var(--font-ui)', fontSize: '.85rem', fontWeight: 600,
              padding: '.75rem', borderRadius: 'var(--r-md)', border: 'none',
              background: 'var(--c-forest)', color: '#fff', cursor: 'pointer',
              transition: 'background var(--t-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--c-canopy)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--c-forest)'}>
            Upgrade to Pro — $3/month
          </button>
          <p style={{ fontSize: '.7rem', color: 'var(--c-text-3)', margin: 0 }}>
            Cancel anytime · No card needed for free tier
          </p>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} intent="upgrade" />}
    </>
  )
}
