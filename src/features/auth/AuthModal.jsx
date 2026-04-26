/**
 * src/features/auth/AuthModal.jsx
 *
 * Views:
 *   'signin'  — email + password sign in
 *   'signup'  — email + password sign up (with strength bar)
 *   'reset'   — forgot password (email only, sends Supabase reset link)
 *   'done'    — post-action confirmation screen
 *
 * Props:
 *   intent    'signup' | 'signin' | 'upgrade'
 *   onClose   () => void
 */
import { useState, useEffect, useCallback, useRef, useId, forwardRef } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import BonsaiLogo from '../../components/ui/BonsaiLogo'

/* ── Password strength ─────────────────────────────────────────────── */
function passwordStrength(p) {
  if (!p) return { score: 0, label: '' }
  let score = 0
  if (p.length >= 8)              score++
  if (p.length >= 12)             score++
  if (/[A-Z]/.test(p))           score++
  if (/[0-9]/.test(p))           score++
  if (/[^A-Za-z0-9]/.test(p))   score++
  const labels = ['','Weak','Fair','Good','Strong','Very strong']
  const colors = ['','var(--error)','var(--warning)','#B8D44A','var(--c)','var(--c)']
  return { score, label: labels[score] ?? '', color: colors[score] ?? 'var(--c)' }
}

/* ── Field component ───────────────────────────────────────────────── */
const Field = forwardRef(function Field(
  { id, label, type, value, onChange, hint, disabled, autoComplete, required },
  ref
) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const isPass = type === 'password'
  const inputType = isPass ? (show ? 'text' : 'password') : type

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <label htmlFor={id} style={{
          fontSize:   '.72rem',
          fontWeight: 600,
          color:      'var(--t-secondary)',
          cursor:     'pointer',
        }}>
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: '.68rem', color: 'var(--t-tertiary)' }}>{hint}</span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          ref={ref}
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          spellCheck={false}
          style={{
            width:        '100%',
            padding:      isPass ? '.62rem 2.6rem .62rem .75rem' : '.62rem .75rem',
            borderRadius: 'var(--r-sm)',
            border:       `1px solid ${focused ? 'var(--c)' : 'var(--border-2)'}`,
            background:   'var(--surface-2)',
            color:        'var(--t-primary)',
            fontFamily:   'var(--font-ui)',
            fontSize:     '.86rem',
            outline:      'none',
            boxSizing:    'border-box',
            boxShadow:    focused ? 'var(--shadow-c)' : 'none',
            transition:   'border-color var(--t-fast), box-shadow var(--t-fast)',
            opacity:      disabled ? .5 : 1,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {/* Show/hide toggle for password */}
        {isPass && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow(v => !v)}
            style={{
              position:       'absolute',
              right:          10,
              top:            '50%',
              transform:      'translateY(-50%)',
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              color:          'var(--t-tertiary)',
              padding:        2,
              display:        'flex',
              alignItems:     'center',
              transition:     'color var(--t-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t-tertiary)'}
            aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  )
})

/* ── Strength bar ──────────────────────────────────────────────────── */
function StrengthBar({ password }) {
  const { score, label, color } = passwordStrength(password)
  if (!password) return null
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= score ? color : 'var(--border)',
            transition: 'background .2s ease',
          }} />
        ))}
      </div>
      {label && (
        <p style={{ fontSize: '.65rem', color, margin: 0, fontWeight: 600 }}>
          {label}
        </p>
      )}
    </div>
  )
}

/* ── Error box ─────────────────────────────────────────────────────── */
function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div style={{
      display:      'flex',
      alignItems:   'flex-start',
      gap:          8,
      padding:      '9px 11px',
      borderRadius: 'var(--r-sm)',
      background:   'var(--error-bg)',
      border:       '1px solid rgba(255,107,107,.25)',
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
           style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="7" cy="7" r="6" stroke="var(--error)" strokeWidth="1.3"/>
        <path d="M7 4.5v3M7 9.5h.01" stroke="var(--error)"
              strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize: '.76rem', color: 'var(--error)', margin: 0, lineHeight: 1.45 }}>
        {message}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN MODAL
   ══════════════════════════════════════════════════════════════════════ */
export default function AuthModal({ onClose, intent = 'signup' }) {
  /* Start on sign-in tab if intent is signin, else sign-up */
  const [view,     setView]     = useState(intent === 'signin' ? 'signin' : 'signup')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  /* done: { kind: 'signup'|'signin'|'reset' } */
  const [done,     setDone]     = useState(null)

  const { signIn, signUp, resetPassword } = useAuthStore()
  const emailId = useId()
  const passId  = useId()
  const firstRef = useRef(null)

  /* Focus first field on open */
  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [view])

  /* Escape key */
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  /* Body scroll lock */
  useEffect(() => {
    document.body.classList.add('body-locked')
    return () => document.body.classList.remove('body-locked')
  }, [])

  const resetForm = useCallback(() => {
    setError(null)
    setPassword('')
  }, [])

  const switchView = useCallback((v) => {
    setView(v)
    resetForm()
  }, [resetForm])

  /* ── Submit ─────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    /* Client-side validation */
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }

    if (view === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
    } else {
      if (!password) { setError('Please enter your password.'); return }
    }

    setLoading(true)
    try {
      const { error: err } = view === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password)

      if (err) {
        setError(humanizeError(err.message))
        setLoading(false)
        return
      }

      if (view === 'signin') {
        /* Sign-in is immediate — close modal */
        setDone({ kind: 'signin' })
        setTimeout(onClose, 1000)
      } else {
        /* Sign-up sends confirmation email */
        setDone({ kind: 'signup' })
      }
    } catch (ex) {
      setError(ex?.message ?? 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  /* ── Forgot password ────────────────────────────────────────────── */
  const handleReset = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) { setError('Enter your email address above first.'); return }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }

    setLoading(true)
    try {
      const { error: err } = await resetPassword(email.trim())
      setLoading(false)
      if (err) { setError(humanizeError(err.message)); return }
      setDone({ kind: 'reset' })
    } catch (ex) {
      setError(ex?.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={view === 'signin' ? 'Sign in' : 'Create account'}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position:            'fixed',
        inset:               0,
        zIndex:              'var(--z-modal)',
        display:             'flex',
        alignItems:          'center',
        justifyContent:      'center',
        padding:             '1rem',
        background:          'rgba(14,17,16,.75)',
        backdropFilter:      'blur(10px)',
        WebkitBackdropFilter:'blur(10px)',
        animation:           'fade-in .18s ease both',
      }}>

      {/* Panel */}
      <div style={{
        width:        '100%',
        maxWidth:     420,
        background:   'var(--surface)',
        border:       '1px solid var(--border-2)',
        borderRadius: 'var(--r-xl)',
        boxShadow:    'var(--shadow-xl)',
        overflow:     'hidden',
        animation:    'fade-up .22s cubic-bezier(.22,1,.36,1) both',
      }}>

        {/* Celadon top accent line */}
        <div style={{
          height:     2,
          background: 'linear-gradient(90deg, var(--c-dark), var(--c))',
        }} />

        <div style={{ padding: '1.75rem 1.75rem 2rem' }}>

          {/* Header row */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BonsaiLogo size={22} />
              <span style={{ lineHeight: 1, userSelect: 'none' }}>
                <span style={{
                  fontFamily: 'var(--font-brand)', fontStyle: 'italic',
                  fontWeight: 600, fontSize: '1rem', color: 'var(--c)',
                }}>Bon</span>
                <span style={{
                  fontFamily: 'var(--font-brand)',
                  fontWeight: 800, fontSize: '1rem', color: 'var(--t-primary)',
                }}>sai</span>
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background:   'none',
                border:       'none',
                cursor:       'pointer',
                color:        'var(--t-tertiary)',
                padding:      6,
                borderRadius: 6,
                display:      'flex',
                alignItems:   'center',
                transition:   'color var(--t-fast), background var(--t-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color      = 'var(--t-primary)'
                e.currentTarget.style.background = 'var(--surface-2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color      = 'var(--t-tertiary)'
                e.currentTarget.style.background = 'transparent'
              }}>
              <CloseIcon />
            </button>
          </div>

          {/* Pro upgrade callout (upgrade intent only) */}
          {intent === 'upgrade' && !done && (
            <div style={{
              display:      'flex',
              gap:          10,
              padding:      '10px 12px',
              marginBottom: '1.25rem',
              borderRadius: 'var(--r-md)',
              background:   'var(--c-bg)',
              border:       '1px solid var(--c-border)',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                   style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M8 1L10 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H6L8 1Z"
                  fill="var(--c)" fillOpacity=".3" stroke="var(--c)" strokeWidth="1.2"
                  strokeLinejoin="round"/>
              </svg>
              <div>
                <p style={{ fontSize: '.76rem', fontWeight: 700,
                            color: 'var(--c)', margin: '0 0 2px' }}>
                  Unlock Pro Mode
                </p>
                <p style={{ fontSize: '.7rem', color: 'var(--t-secondary)', margin: 0 }}>
                  Unlimited images, live preview, 2-week history, format conversion.
                </p>
              </div>
            </div>
          )}

          {/* ── DONE SCREEN ─────────────────────────────────────────── */}
          {done ? (
            <DoneScreen kind={done.kind} email={email} onClose={onClose} />
          ) : (
            <>
              {/* ── RESET VIEW ────────────────────────────────────────── */}
              {view === 'reset' ? (
                <ResetView
                  email={email}
                  onEmailChange={e => setEmail(e.target.value)}
                  onSubmit={handleReset}
                  onBack={() => switchView('signin')}
                  loading={loading}
                  error={error}
                  emailId={emailId}
                  emailRef={firstRef} />
              ) : (
                <>
                  {/* ── TABS ────────────────────────────────────────────── */}
                  <div style={{
                    display:      'flex',
                    background:   'var(--ink-3)',
                    borderRadius: 'var(--r-sm)',
                    padding:      3,
                    gap:          3,
                    marginBottom: '1.4rem',
                  }}>
                    {[
                      { id: 'signup', label: 'Create account' },
                      { id: 'signin', label: 'Sign in' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => switchView(t.id)}
                        style={{
                          flex:         1,
                          padding:      '.4rem .5rem',
                          borderRadius: 'var(--r-xs)',
                          border:       'none',
                          fontFamily:   'var(--font-ui)',
                          fontSize:     '.76rem',
                          fontWeight:   view === t.id ? 700 : 500,
                          cursor:       'pointer',
                          background:   view === t.id ? 'var(--surface)' : 'transparent',
                          color:        view === t.id ? 'var(--t-primary)' : 'var(--t-tertiary)',
                          boxShadow:    view === t.id ? 'var(--shadow-xs)' : 'none',
                          transition:   'all var(--t-fast)',
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Heading ──────────────────────────────────────────── */}
                  <h2 style={{
                    fontFamily:    'var(--font-brand)',
                    fontWeight:    700,
                    fontSize:      '1.3rem',
                    letterSpacing: '-.028em',
                    color:         'var(--t-primary)',
                    margin:        '0 0 .35rem',
                    lineHeight:    1.15,
                  }}>
                    {view === 'signin'
                      ? 'Welcome back'
                      : intent === 'upgrade' ? 'Create your account' : 'Get started free'}
                  </h2>
                  <p style={{
                    fontSize:     '.8rem',
                    color:        'var(--t-secondary)',
                    margin:       '0 0 1.4rem',
                    lineHeight:   1.55,
                  }}>
                    {view === 'signin'
                      ? 'Sign in to access your history and Pro features.'
                      : 'Free forever. No credit card required.'}
                  </p>

                  {/* ── Form ─────────────────────────────────────────────── */}
                  <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                      {/* Email */}
                      <Field
                        id={emailId}
                        ref={firstRef}
                        label="Email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={loading}
                        autoComplete="email"
                        required />

                      {/* Password */}
                      <div>
                        <Field
                          id={passId}
                          label="Password"
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          disabled={loading}
                          autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                          hint={view === 'signup' ? 'Min. 8 characters' : undefined}
                          required />

                        {/* Strength bar (signup only) */}
                        {view === 'signup' && password && (
                          <div style={{ marginTop: 8 }}>
                            <StrengthBar password={password} />
                          </div>
                        )}

                        {/* Forgot password (signin only) */}
                        {view === 'signin' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                            <button
                              type="button"
                              onClick={() => switchView('reset')}
                              style={{
                                background:     'none',
                                border:         'none',
                                fontFamily:     'var(--font-ui)',
                                fontSize:       '.71rem',
                                color:          'var(--t-tertiary)',
                                cursor:         'pointer',
                                padding:        0,
                                transition:     'color var(--t-fast)',
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--c)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--t-tertiary)'}>
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Error */}
                      <ErrorBox message={error} />

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={loading || !email || !password}
                        style={{
                          width:         '100%',
                          padding:       '.72rem',
                          borderRadius:  'var(--r-md)',
                          border:        'none',
                          background:    'var(--c)',
                          color:         'var(--ink)',
                          fontFamily:    'var(--font-ui)',
                          fontSize:      '.86rem',
                          fontWeight:    700,
                          cursor:        loading || !email || !password ? 'not-allowed' : 'pointer',
                          opacity:       loading || !email || !password ? .5 : 1,
                          transition:    'opacity var(--t-fast), background var(--t-fast)',
                          display:       'flex',
                          alignItems:    'center',
                          justifyContent:'center',
                          gap:           8,
                        }}
                        onMouseEnter={e => {
                          if (!loading && email && password)
                            e.currentTarget.style.background = 'var(--c-dark)'
                        }}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--c)'}>
                        {loading ? (
                          <>
                            <span className="spin" style={{
                              display:       'inline-block',
                              width:         14, height: 14,
                              borderRadius:  '50%',
                              border:        '2px solid rgba(14,17,16,.3)',
                              borderTopColor:'var(--ink)',
                            }} />
                            Please wait…
                          </>
                        ) : view === 'signin' ? 'Sign in' : 'Create account'}
                      </button>

                      {/* Terms note (signup only) */}
                      {view === 'signup' && (
                        <p style={{
                          fontSize:   '.67rem',
                          color:      'var(--t-tertiary)',
                          textAlign:  'center',
                          margin:     0,
                          lineHeight: 1.5,
                        }}>
                          By signing up you agree to our{' '}
                          <span style={{ color: 'var(--t-secondary)', cursor: 'pointer' }}>
                            Terms of Service
                          </span>
                          {' '}and{' '}
                          <span style={{ color: 'var(--t-secondary)', cursor: 'pointer' }}>
                            Privacy Policy
                          </span>.
                        </p>
                      )}
                    </div>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Reset password view ───────────────────────────────────────────── */
function ResetView({ email, onEmailChange, onSubmit, onBack, loading, error, emailId, emailRef }) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        5,
          background: 'none',
          border:     'none',
          fontFamily: 'var(--font-ui)',
          fontSize:   '.76rem',
          color:      'var(--t-tertiary)',
          cursor:     'pointer',
          padding:    0,
          marginBottom:'1.1rem',
          transition: 'color var(--t-fast)',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--t-secondary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--t-tertiary)'}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
             stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 2L3 6l4 4"/><path d="M3 6h7"/>
        </svg>
        Back to sign in
      </button>

      <h2 style={{
        fontFamily:'var(--font-brand)', fontWeight:700, fontSize:'1.3rem',
        letterSpacing:'-.028em', color:'var(--t-primary)', margin:'0 0 .35rem',
      }}>
        Reset your password
      </h2>
      <p style={{ fontSize:'.8rem', color:'var(--t-secondary)', margin:'0 0 1.4rem', lineHeight:1.55 }}>
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field
            id={emailId}
            ref={emailRef}
            label="Email"
            type="email"
            value={email}
            onChange={onEmailChange}
            disabled={loading}
            autoComplete="email"
            required />

          <ErrorBox message={error} />

          <button
            type="submit"
            disabled={loading || !email}
            style={{
              width:'100%', padding:'.72rem', borderRadius:'var(--r-md)',
              border:'none', background:'var(--c)', color:'var(--ink)',
              fontFamily:'var(--font-ui)', fontSize:'.86rem', fontWeight:700,
              cursor: loading || !email ? 'not-allowed' : 'pointer',
              opacity: loading || !email ? .5 : 1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'opacity var(--t-fast), background var(--t-fast)',
            }}
            onMouseEnter={e => { if (!loading && email) e.currentTarget.style.background = 'var(--c-dark)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--c)'}>
            {loading ? (
              <>
                <span className="spin" style={{
                  display:'inline-block', width:14, height:14, borderRadius:'50%',
                  border:'2px solid rgba(14,17,16,.3)', borderTopColor:'var(--ink)',
                }}/>
                Sending…
              </>
            ) : 'Send reset link'}
          </button>
        </div>
      </form>
    </>
  )
}

/* ── Done / success screen ─────────────────────────────────────────── */
function DoneScreen({ kind, email, onClose }) {
  const configs = {
    signup: {
      icon:    <EnvelopeIcon />,
      title:   'Check your email',
      message: `We sent a confirmation link to ${email}. Click it to activate your account.`,
      note:    'Can't find it? Check your spam folder.',
      action:  null,
    },
    signin: {
      icon:    <CheckIcon />,
      title:   'Signed in!',
      message: 'Welcome back. Taking you to your workspace…',
      note:    null,
      action:  null,
    },
    reset: {
      icon:    <EnvelopeIcon />,
      title:   'Reset link sent',
      message: `We sent a password reset link to ${email}.`,
      note:    'The link expires in 1 hour. Check your spam if it doesn't arrive.',
      action:  null,
    },
  }

  const cfg = configs[kind] ?? configs.signup

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      textAlign:      'center',
      padding:        '.5rem 0 .25rem',
      gap:            14,
      animation:      'scale-in .24s cubic-bezier(.34,1.56,.64,1) both',
    }}>
      <div style={{
        width:           52, height: 52,
        borderRadius:    '50%',
        background:      'var(--c-bg)',
        border:          '1px solid var(--c-border)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        color:           'var(--c)',
      }}>
        {cfg.icon}
      </div>

      <div>
        <h3 style={{
          fontFamily:    'var(--font-brand)',
          fontWeight:    700,
          fontSize:      '1.1rem',
          letterSpacing: '-.025em',
          color:         'var(--t-primary)',
          margin:        '0 0 .4rem',
        }}>
          {cfg.title}
        </h3>
        <p style={{ fontSize: '.8rem', color: 'var(--t-secondary)',
                    margin: 0, lineHeight: 1.6, maxWidth: 280 }}>
          {cfg.message}
        </p>
        {cfg.note && (
          <p style={{ fontSize: '.7rem', color: 'var(--t-tertiary)',
                      margin: '.5rem 0 0', lineHeight: 1.5 }}>
            {cfg.note}
          </p>
        )}
      </div>

      <button
        onClick={onClose}
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 4 }}>
        {kind === 'signin' ? 'Continue' : 'Got it'}
      </button>
    </div>
  )
}

/* ── Human-readable Supabase error messages ────────────────────────── */
function humanizeError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'Incorrect email or password.'
  if (m.includes('email not confirmed'))
    return 'Please confirm your email before signing in. Check your inbox.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try signing in instead.'
  if (m.includes('password') && m.includes('short'))
    return 'Password must be at least 8 characters.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (m.includes('network') || m.includes('fetch'))
    return 'Connection error. Check your internet and try again.'
  if (m.includes('not configured'))
    return 'Authentication is not set up yet. Please contact support.'
  return msg || 'Something went wrong. Please try again.'
}

/* ── Icons ─────────────────────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M2 2l10 10M12 2L2 12"/>
  </svg>
)
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
       stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 7.5C2.5 4 4.8 2 7.5 2s5 2 6.5 5.5C12.5 11 10.2 13 7.5 13S2.5 11 1 7.5Z"/>
    <circle cx="7.5" cy="7.5" r="2"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
       stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2l11 11M6.5 6.6A2 2 0 0 0 8.4 8.5M4 4.3C2.4 5.3 1.3 6.4 1 7.5c1.5 3.5 3.8 5.5 6.5 5.5 1.3 0 2.5-.4 3.5-1.1M7 2c2.8 0 5.1 2 6.5 5.5-.4 1-1 2-1.7 2.7"/>
  </svg>
)
const EnvelopeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="18" height="14" rx="2"/>
    <path d="M2 7l9 6 9-6"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11l5 5 9-9"/>
  </svg>
)
