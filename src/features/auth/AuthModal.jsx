// src/features/auth/AuthModal.jsx
import { useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import BonsaiLogo from '../../components/ui/BonsaiLogo'

// intent: 'signin' | 'signup' | 'upgrade'
export default function AuthModal({ onClose, intent = 'signup' }) {
  const [tab,     setTab]     = useState(intent === 'signin' ? 'in' : 'up')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  const { signIn, signUp, signInWithGoogle, signInWithMagicLink } = useAuthStore()

  async function handle(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const { error: err } = tab === 'in'
        ? await signIn(email, pass)
        : await signUp(email, pass)
      if (err) { setError(err.message); setLoading(false); return }
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch (ex) {
      setError(ex.message)
      setLoading(false)
    }
  }

  async function handleMagic() {
    if (!email) { setError('Enter your email first.'); return }
    setLoading(true); setError(null)
    const { error: err } = await signInWithMagicLink(email)
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
  }

  async function handleGoogle() {
    setLoading(true); setError(null)
    await signInWithGoogle()
    // Supabase redirects — loading stays true until redirect
  }

  return (
    // Backdrop
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position:   'fixed', inset: 0, zIndex: 200,
        display:    'flex', alignItems: 'center', justifyContent: 'center',
        padding:    '1rem',
        background: 'rgba(12,27,17,.5)',
        backdropFilter: 'blur(6px)',
      }}>

      {/* Panel */}
      <div style={{
        width: '100%', maxWidth: 400,
        background:   'var(--c-cream)',
        borderRadius: 'var(--r-xl)',
        border:       '1px solid var(--c-clay)',
        boxShadow:    'var(--shadow-lg)',
        overflow:     'hidden',
        animation:    'fade-up .22s ease both',
      }}>

        {/* Forest top bar */}
        <div style={{ height: 3, background: 'var(--c-forest)' }} />

        <div style={{ padding: '1.75rem 1.75rem 2rem' }}>

          {/* Logo + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BonsaiLogo size={22} />
              <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 700,
                             fontSize: '1rem', color: 'var(--c-ink)' }}>
                <em style={{ fontStyle: 'italic', color: 'var(--c-canopy)' }}>Bon</em>sai
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--c-stone)', padding: 4, borderRadius: 4,
              transition: 'color var(--t-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--c-text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--c-stone)'}>
              <CloseIcon />
            </button>
          </div>

          {/* Heading */}
          <h2 style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: '1.3rem',
                       letterSpacing: '-.025em', color: 'var(--c-ink)', margin: '0 0 .35rem' }}>
            {intent === 'upgrade' ? 'Unlock Pro Mode'
              : tab === 'in' ? 'Welcome back'
              : 'Create your account'}
          </h2>
          <p style={{ fontSize: '.8rem', color: 'var(--c-text-2)', margin: '0 0 1.5rem' }}>
            {intent === 'upgrade'
              ? 'Sign up to get Pro Mode, unlimited compression, and permanent history.'
              : tab === 'in'
                ? 'Sign in to access your compression history and Pro features.'
                : 'Free forever. No credit card required.'}
          </p>

          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <span style={{ fontSize: '2rem' }}>🌿</span>
              <p style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--c-canopy)',
                          marginTop: '.5rem' }}>
                {tab === 'up' ? 'Check your email to confirm!' : 'Signed in!'}
              </p>
            </div>
          ) : (
            <>
              {/* Google */}
              <button onClick={handleGoogle} disabled={loading} style={{
                width: '100%', padding: '.65rem', borderRadius: 'var(--r-md)',
                border: '1px solid var(--c-clay)', background: 'var(--c-cream)',
                fontFamily: 'var(--font-ui)', fontSize: '.82rem', fontWeight: 500,
                color: 'var(--c-text)', cursor: 'pointer', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background var(--t-fast)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-sand)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--c-cream)'}>
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--c-clay)' }} />
                <span style={{ fontSize: '.65rem', color: 'var(--c-stone)', fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--c-clay)' }} />
              </div>

              {/* Tab */}
              <div style={{ display: 'flex', background: 'var(--c-sand)', borderRadius: 'var(--r-sm)',
                            padding: 3, marginBottom: '1rem', gap: 3 }}>
                {[['in', 'Sign in'], ['up', 'Sign up']].map(([id, label]) => (
                  <button key={id} onClick={() => { setTab(id); setError(null) }} style={{
                    flex: 1, padding: '.35rem', borderRadius: 6, border: 'none',
                    fontFamily: 'var(--font-ui)', fontSize: '.78rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all var(--t-fast)',
                    background: tab === id ? 'var(--c-cream)' : 'transparent',
                    color:      tab === id ? 'var(--c-text)' : 'var(--c-text-2)',
                    boxShadow:  tab === id ? 'var(--shadow-xs)' : 'none',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Email" type="email" value={email}
                       onChange={e => setEmail(e.target.value)} />
                <Field label="Password" type="password" value={pass}
                       onChange={e => setPass(e.target.value)} />

                {error && (
                  <p style={{ fontSize: '.74rem', color: 'var(--c-error)', margin: 0,
                              padding: '6px 10px', background: 'rgba(191,59,59,.07)',
                              borderRadius: 'var(--r-sm)' }}>
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading || !email || !pass} style={{
                  width: '100%', padding: '.7rem', borderRadius: 'var(--r-md)',
                  border: 'none', background: 'var(--c-forest)', color: '#fff',
                  fontFamily: 'var(--font-ui)', fontSize: '.85rem', fontWeight: 600,
                  cursor: loading || !email || !pass ? 'not-allowed' : 'pointer',
                  opacity: loading || !email || !pass ? .55 : 1,
                  transition: 'opacity var(--t-fast), background var(--t-fast)',
                }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--c-canopy)' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--c-forest)'}>
                  {loading ? 'Please wait…' : tab === 'in' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              {/* Magic link */}
              <button onClick={handleMagic} disabled={loading} style={{
                width: '100%', marginTop: 8, padding: '.55rem', borderRadius: 'var(--r-md)',
                border: '1px solid var(--c-clay)', background: 'transparent',
                fontFamily: 'var(--font-ui)', fontSize: '.78rem', color: 'var(--c-text-2)',
                cursor: 'pointer', transition: 'background var(--t-fast)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-sand)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Send magic link instead
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 500,
                      color: 'var(--c-text-2)', marginBottom: 4 }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange} autoComplete={type === 'password' ? 'current-password' : 'email'}
        style={{
          width: '100%', padding: '.55rem .7rem',
          borderRadius: 'var(--r-sm)', border: '1px solid var(--c-clay)',
          background: 'var(--c-cream)', color: 'var(--c-text)',
          fontFamily: 'var(--font-ui)', fontSize: '.84rem',
          outline: 'none', transition: 'border-color var(--t-fast)',
          boxSizing: 'border-box',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--c-canopy)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--c-clay)'}
      />
    </div>
  )
}

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M2 2l10 10M12 2L2 12"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M15.3 8.18c0-.56-.05-1.1-.14-1.62H8v3.07h4.1a3.5 3.5 0 0 1-1.52 2.3v1.91h2.46c1.44-1.33 2.27-3.29 2.27-5.66Z" fill="#4285F4"/>
    <path d="M8 16c2.05 0 3.77-.68 5.03-1.84l-2.46-1.91c-.68.46-1.55.73-2.57.73-1.97 0-3.64-1.33-4.24-3.12H1.22v1.97A8 8 0 0 0 8 16Z" fill="#34A853"/>
    <path d="M3.76 9.86A4.79 4.79 0 0 1 3.51 8c0-.65.11-1.28.25-1.86V4.17H1.22A8 8 0 0 0 0 8c0 1.29.31 2.51.86 3.59l2.9-1.73Z" fill="#FBBC05"/>
    <path d="M8 3.18c1.11 0 2.1.38 2.88 1.13l2.16-2.16A7.93 7.93 0 0 0 8 0 8 8 0 0 0 1.22 4.17l2.54 1.97C4.36 4.5 6.03 3.18 8 3.18Z" fill="#EA4335"/>
  </svg>
)
