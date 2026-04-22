/**
 * src/App.jsx
 * Shell — navbar, page routing, footer. Zero business logic.
 *
 * Pages:   'tool' (default) | 'pricing'
 * Routing: All navigation via state — no React Router needed at this scale.
 *          Easy to swap in React Router later without touching any other file.
 */
import { useState, useCallback, useRef, useEffect, forwardRef } from 'react'
import BonsaiLogo  from './components/ui/BonsaiLogo'
import ToolPage    from './pages/ToolPage'
import PricingPage from './pages/PricingPage'
import AuthModal   from './features/auth/AuthModal'
import { useAuthStore } from './store/useAuthStore'

/* ── App root ──────────────────────────────────────────────────────── */
export default function App() {
  const [page,       setPage]       = useState('tool')
  const [showAuth,   setShowAuth]   = useState(false)
  const [authIntent, setAuthIntent] = useState('signup')

  const openAuth = useCallback((intent = 'signup') => {
    setAuthIntent(intent)
    setShowAuth(true)
  }, [])

  const goTool    = useCallback(() => setPage('tool'), [])
  const goPricing = useCallback(() => setPage('pricing'), [])
  const goHow     = useCallback(() => {
    setPage('tool')
    // Give ToolPage one frame to mount before scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    })
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>

      <Navbar
        page={page}
        onTool={goTool}
        onPricing={goPricing}
        onHow={goHow}
        onAuth={openAuth} />

      <main style={{ flex: 1 }}>
        {page === 'pricing'
          ? <PricingPage onBack={goTool}    onAuth={openAuth} />
          : <ToolPage    onPricing={goPricing} onAuth={openAuth} />}
      </main>

      <Footer onPricing={goPricing} onHow={goHow} onAuth={openAuth} />

      {showAuth && (
        <AuthModal
          intent={authIntent}
          onClose={() => setShowAuth(false)} />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   NAVBAR
   ══════════════════════════════════════════════════════════════════════ */
function Navbar({ page, onTool, onPricing, onHow, onAuth }) {
  const { user, plan, loading, signOut } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef(null)

  /* Close user dropdown on outside click */
  useEffect(() => {
    if (!userOpen) return
    const fn = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [userOpen])

  /* Close mobile sheet on Escape */
  useEffect(() => {
    if (!menuOpen) return
    const fn = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [menuOpen])

  /* Lock body scroll when mobile sheet is open */
  useEffect(() => {
    document.body.classList.toggle('body-locked', menuOpen)
    return () => document.body.classList.remove('body-locked')
  }, [menuOpen])

  /* Close mobile sheet when navigating */
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const navigate  = useCallback((fn) => { closeMenu(); fn() }, [closeMenu])

  const initials  = user?.email?.slice(0, 2).toUpperCase() ?? '?'
  const planLabel = { pro: 'Pro', supporter: 'Supporter', free: 'Free' }[plan] ?? 'Free'

  return (
    <>
      <header style={{
        position:             'sticky',
        top:                  0,
        zIndex:               'var(--z-nav)',
        background:           'rgba(14,17,16,.94)',
        borderBottom:         '1px solid var(--border)',
        backdropFilter:       'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}>
        <div style={{
          maxWidth:       960,
          margin:         '0 auto',
          padding:        '.72rem 1.25rem',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            12,
        }}>

          {/* ── Logo ──────────────────────────────────────────── */}
          <button
            onClick={onTool}
            aria-label="Bonsai — go home"
            style={{ display: 'flex', alignItems: 'center', gap: 7,
                     background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                     flexShrink: 0 }}>
            <BonsaiLogo size={26} />
            <Wordmark />
          </button>

          {/* ── Desktop nav (hidden on mobile via CSS) ────────── */}
          {/* NOTE: no display in inline style — CSS class owns that */}
          <nav className="hide-mobile" style={{ alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}>

            <NavLink label="How it works" onClick={onHow} />
            <NavLink label="Pricing"      onClick={onPricing} active={page === 'pricing'} />

            {/* Separator */}
            <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 8px', flexShrink: 0 }} />

            {/* Auth area */}
            {loading ? (
              <div className="skeleton" style={{ width: 90, height: 32, borderRadius: 'var(--r-full)' }} />
            ) : user ? (
              <UserChip
                ref={userRef}
                initials={initials}
                planLabel={planLabel}
                plan={plan}
                email={user.email}
                open={userOpen}
                onToggle={() => setUserOpen(v => !v)}
                onUpgrade={() => { setUserOpen(false); onAuth('upgrade') }}
                onSignOut={async () => { setUserOpen(false); await signOut() }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => onAuth('signin')}>
                  Sign in
                </button>
                <button className="btn btn-primary btn-sm"
                  onClick={() => onAuth('signup')}>
                  Get started
                </button>
              </div>
            )}
          </nav>

          {/* ── Mobile right zone (hidden on desktop via CSS) ─── */}
          {/* NOTE: no display in inline style — CSS class owns that */}
          <div className="show-mobile" style={{ alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!user && (
              <button className="btn btn-primary btn-sm"
                onClick={() => onAuth('signup')}>
                Get started
              </button>
            )}
            <button
              className="btn btn-icon"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}>
              <HamburgerIcon />
            </button>
          </div>

        </div>
      </header>

      {/* ── Mobile slide-in sheet ───────────────────────────────── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="mobile-nav-overlay"
            onClick={closeMenu}
            aria-hidden="true" />

          {/* Sheet */}
          <div
            className="mobile-nav-sheet"
            role="dialog"
            aria-label="Navigation menu"
            aria-modal="true">

            {/* Sheet header */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '14px 18px',
              borderBottom:   '1px solid var(--border)',
            }}>
              <Wordmark />
              <button
                className="btn btn-icon"
                onClick={closeMenu}
                aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ padding: '8px', flex: 1 }}>
              <SheetLink
                label="How it works"
                onClick={() => navigate(onHow)} />
              <SheetLink
                label="Pricing"
                onClick={() => navigate(onPricing)}
                active={page === 'pricing'} />
            </nav>

            {/* Auth section */}
            <div style={{
              padding:     '14px 14px 32px',
              borderTop:   '1px solid var(--border)',
              display:     'flex',
              flexDirection:'column',
              gap:          8,
            }}>
              {loading ? (
                <div className="skeleton" style={{ height: 44, borderRadius: 'var(--r-sm)' }} />
              ) : user ? (
                <>
                  {/* User info card */}
                  <div style={{
                    padding:      '10px 12px',
                    background:   'var(--surface-2)',
                    borderRadius: 'var(--r-md)',
                    border:       '1px solid var(--border)',
                    marginBottom: 2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--c)', color: 'var(--ink)',
                        fontSize: '.65rem', fontWeight: 800, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {initials}
                      </span>
                      <div>
                        <p style={{ fontSize: '.76rem', fontWeight: 600, color: 'var(--t-primary)', margin: 0 }}>
                          {user.email}
                        </p>
                        <p style={{ fontSize: '.64rem', color: 'var(--c)', margin: '2px 0 0', fontWeight: 500 }}>
                          {planLabel} plan
                        </p>
                      </div>
                    </div>
                  </div>

                  {plan !== 'pro' && (
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => { closeMenu(); onAuth('upgrade') }}>
                      Upgrade to Pro
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-block"
                    onClick={async () => { closeMenu(); await signOut() }}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-block"
                    style={{ fontSize: '.88rem', padding: '.7rem' }}
                    onClick={() => { closeMenu(); onAuth('signup') }}>
                    Get started free
                  </button>
                  <button
                    className="btn btn-ghost btn-block"
                    style={{ fontSize: '.88rem', padding: '.7rem' }}
                    onClick={() => { closeMenu(); onAuth('signin') }}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   USER CHIP  (logged-in navbar state)
   ══════════════════════════════════════════════════════════════════════ */
const UserChip = forwardRef(function UserChip(
  { initials, planLabel, plan, email, open, onToggle, onUpgrade, onSignOut },
  ref
) {
  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* Trigger */}
      <button
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Account — ${planLabel} plan`}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          7,
          padding:      '4px 10px 4px 4px',
          background:   open ? 'var(--surface-2)' : 'transparent',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--r-full)',
          cursor:       'pointer',
          transition:   'background var(--t-fast), border-color var(--t-fast)',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background    = 'var(--surface-2)'
            e.currentTarget.style.borderColor   = 'var(--border-2)'
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background    = 'transparent'
            e.currentTarget.style.borderColor   = 'var(--border)'
          }
        }}>

        {/* Avatar */}
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background:   'var(--c)',
          color:        'var(--ink)',
          fontSize:     '.62rem',
          fontWeight:   800,
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          flexShrink:   0,
          letterSpacing:'.02em',
        }}>
          {initials}
        </span>

        {/* Plan label */}
        <span style={{ fontSize: '.76rem', fontWeight: 500, color: 'var(--t-primary)' }}>
          {planLabel}
        </span>

        <ChevronDownIcon open={open} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="dropdown"
          style={{ top: 'calc(100% + 8px)', right: 0, minWidth: 210 }}>

          {/* User info */}
          <div style={{ padding: '11px 14px 10px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--t-primary)', margin: 0 }}>
              {email}
            </p>
            <p style={{ fontSize: '.64rem', color: 'var(--c)', margin: '3px 0 0', fontWeight: 500 }}>
              {planLabel} plan
            </p>
          </div>

          {/* Upgrade (non-pro only) */}
          {plan !== 'pro' && (
            <button
              className="dropdown-item"
              onClick={onUpgrade}
              style={{ color: 'var(--c)', fontWeight: 600 }}>
              <UpgradeIcon />
              Upgrade to Pro
            </button>
          )}

          {/* Sign out */}
          <button className="dropdown-item" onClick={onSignOut}>
            <SignOutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
})

/* ══════════════════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════════════════ */
function Footer({ onPricing, onHow, onAuth }) {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 1.25rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Main row — stacks via CSS */}
        <div className="footer-grid">

          {/* Brand */}
          <div className="footer-col-brand">
            <div style={{ marginBottom: 6 }}>
              <Wordmark />
            </div>
            <p style={{ fontSize: '.7rem', color: 'var(--t-tertiary)', lineHeight: 1.55, maxWidth: 200 }}>
              Professional compression refined to precision. Inspired by the art of bonsai.
            </p>
          </div>

          {/* Links */}
          <div className="footer-col-links" style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem 1.5rem', alignItems: 'flex-start', paddingTop: 2 }}>
            {[
              { label: 'How it works', fn: onHow },
              { label: 'Pricing',      fn: onPricing },
              { label: 'Privacy',      fn: null },
              { label: 'Terms',        fn: null },
            ].map(l => (
              <button key={l.label}
                onClick={l.fn ?? undefined}
                style={{
                  background:  'none',
                  border:      'none',
                  fontFamily:  'var(--font-ui)',
                  fontSize:    '.74rem',
                  color:       'var(--t-tertiary)',
                  cursor:      l.fn ? 'pointer' : 'default',
                  padding:     0,
                  transition:  'color var(--t-fast)',
                }}
                onMouseEnter={e => l.fn && (e.currentTarget.style.color = 'var(--t-secondary)')}
                onMouseLeave={e => l.fn && (e.currentTarget.style.color = 'var(--t-tertiary)')}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Privacy badge */}
          <div className="footer-col-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
            <ShieldIcon />
            <span style={{ fontSize: '.68rem', color: 'var(--t-tertiary)' }}>
              Images never leave your device
            </span>
          </div>
        </div>

        {/* Bottom rule */}
        <div style={{
          marginTop:      '1.5rem',
          paddingTop:     '1rem',
          borderTop:      '1px solid var(--border)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flexWrap:       'wrap',
          gap:            '.5rem',
        }}>
          <p style={{ fontSize: '.65rem', color: 'var(--t-tertiary)', margin: 0 }}>
            © {new Date().getFullYear()} Bonsai. All rights reserved.
          </p>
          <p style={{ fontSize: '.65rem', color: 'var(--t-tertiary)', margin: 0 }}>
            Made with care for professionals who care about quality.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════════════ */

function Wordmark() {
  return (
    <span style={{ lineHeight: 1, userSelect: 'none' }}>
      <span style={{
        fontFamily: 'var(--font-brand)',
        fontStyle:  'italic',
        fontWeight: 600,
        fontSize:   '1.6rem',
        color:      'var(--c)',
      }}>
        Bon
      </span>
      <span style={{
        fontFamily: 'var(--font-brand)',
        fontWeight: 800,
        fontSize:   '1.6rem',
        color:      'var(--t-primary)',
      }}>
        sai
      </span>
    </span>
  )
}

function NavLink({ label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:   'none',
        border:       'none',
        cursor:       'pointer',
        fontFamily:   'var(--font-ui)',
        fontSize:     '.8rem',
        fontWeight:   active ? 600 : 400,
        color:        active ? 'var(--t-primary)' : 'var(--t-tertiary)',
        padding:      '.4rem .75rem',
        borderRadius: 'var(--r-sm)',
        transition:   'color var(--t-fast), background var(--t-fast)',
        position:     'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color      = 'var(--t-primary)'
        e.currentTarget.style.background = 'var(--surface-2)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color      = active ? 'var(--t-primary)' : 'var(--t-tertiary)'
        e.currentTarget.style.background = 'transparent'
      }}>
      {label}
      {/* Active underline dot */}
      {active && (
        <span style={{
          position:     'absolute',
          bottom:       3,
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        4,
          height:       4,
          borderRadius: '50%',
          background:   'var(--c)',
        }} />
      )}
    </button>
  )
}

function SheetLink({ label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:      'flex',
        alignItems:   'center',
        width:        '100%',
        padding:      '13px 12px',
        background:   active ? 'var(--c-bg)' : 'transparent',
        border:       'none',
        borderRadius: 'var(--r-sm)',
        fontFamily:   'var(--font-ui)',
        fontSize:     '.9rem',
        fontWeight:   active ? 600 : 400,
        color:        active ? 'var(--c)' : 'var(--t-secondary)',
        cursor:       'pointer',
        textAlign:    'left',
        transition:   'background var(--t-fast)',
      }}
      onMouseEnter={e => !active && (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}>
      {label}
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ICONS
   ══════════════════════════════════════════════════════════════════════ */
const HamburgerIcon = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M1 1h14M1 6h14M1 11h14"/>
  </svg>
)
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M2 2l10 10M12 2L2 12"/>
  </svg>
)
const ChevronDownIcon = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
       stroke="var(--t-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
       style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--t-base)', flexShrink: 0 }}>
    <path d="M2 3.5l3 3 3-3"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="11" height="13" viewBox="0 0 12 14" fill="none"
       stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 1L1.5 3v3.5C1.5 9.5 6 13 6 13s4.5-3.5 4.5-6.5V3L6 1z"/>
  </svg>
)
const UpgradeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1v8M4 4L7 1l3 3"/><path d="M2 10h10v3H2z"/>
  </svg>
)
const SignOutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M9 10l3-3-3-3M5 7h7"/>
  </svg>
)
