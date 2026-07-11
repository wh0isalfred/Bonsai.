// src/pages/PricingPage.jsx
import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'

const PRICE_IDS = {
  pro:       import.meta.env.VITE_STRIPE_PRO_PRICE_ID       ?? '',
  supporter: import.meta.env.VITE_STRIPE_SUPPORTER_PRICE_ID ?? '',
}

export default function PricingPage({ onBack, onAuth }) {
  const { user, plan, session } = useAuthStore()
  const [checkoutLoading, setCheckoutLoading] = useState(null) // tier id being loaded

  async function handleUpgrade(tier) {
    const priceId = PRICE_IDS[tier]

    if (!priceId) {
      alert('Payment not configured yet. Check your .env for VITE_STRIPE_' + tier.toUpperCase() + '_PRICE_ID')
      return
    }

    setCheckoutLoading(tier)
    try {
      /* Call the Supabase Edge Function */
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ priceId }),
        }
      )

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Failed to create checkout session')
      }

      /* Redirect to Stripe Checkout */
      window.location.href = data.url

    } catch (err) {
      console.error('[checkout]', err)
      alert(err.message ?? 'Something went wrong. Please try again.')
      setCheckoutLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '3rem 1.25rem 6rem' }}>

      {/* Back */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center',
        gap: 6, fontSize: '.82rem', color: 'var(--t-secondary)', marginBottom: '2.5rem',
      }}>
        <ArrowLeft /> Back to tool
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: 'var(--c)', marginBottom: '.5rem' }}>
          Pricing
        </p>
        <h1 style={{ fontFamily: 'var(--font-brand)', fontWeight: 700,
                     fontSize: 'clamp(2rem, 5vw, 2.8rem)', letterSpacing: '-.035em',
                     lineHeight: 1.1, color: 'var(--t-primary)', margin: '0 0 .6rem' }}>
          Simple, honest pricing
        </h1>
        <p style={{ fontSize: '.92rem', color: 'var(--t-secondary)', margin: 0 }}>
          Two modes. One tool. No tricks.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
                    gap: '1rem', alignItems: 'start' }}>
        {PLANS.map(p => (
          <PlanCard
            key={p.name}
            plan={p}
            currentPlan={plan}
            isLoggedIn={!!user}
            onAuth={onAuth}
            onBack={onBack}
            onUpgrade={handleUpgrade}
            loadingTier={checkoutLoading} />
        ))}
      </div>

      {/* Trust signals */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
                    gap: '1.5rem', marginTop: '2.5rem' }}>
        {['Runs 100% in your browser', 'No credit card to start free', '15 images free · unlimited from $0.05/mo', 'Cancel anytime'].map(t => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5,
                                 fontSize: '.73rem', color: 'var(--t-tertiary)' }}>
            <span style={{ color: 'var(--c)', fontSize: '.7rem' }}>✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Plan card ────────────────────────────────────────────────────────────── */
function PlanCard({ plan, currentPlan, isLoggedIn, onAuth, onBack, onUpgrade, loadingTier }) {
  const hi        = plan.highlight
  const isCurrent = currentPlan === plan.tier
  const isLoading = loadingTier === plan.tier

  function handleCta() {
    if (isCurrent || isLoading) return

    if (plan.tier === 'free') { onBack(); return }

    if (!isLoggedIn) { onAuth('signup'); return }

    /* Logged in — go to Stripe checkout */
    onUpgrade(plan.tier)
  }

  const ctaLabel = isCurrent        ? 'Current plan'
    : isLoading                     ? 'Redirecting to Stripe…'
    : plan.tier === 'free'          ? 'Start compressing'
    : !isLoggedIn                   ? 'Get started'
    : plan.cta

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRadius: 'var(--r-xl)',
      border:     hi ? '1.5px solid var(--c)' : '1px solid var(--border)',
      background: hi ? 'var(--ink)' : 'var(--surface)',
      boxShadow:  hi ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      transform:  hi ? 'translateY(-6px)' : 'none',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Ghost bonsai watermark on Pro card */}
      {hi && (
        <div style={{ position: 'absolute', right: -12, top: -8, opacity: .06, pointerEvents: 'none' }}>
          <BonsaiWatermark />
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: '1.6rem 1.6rem 1.3rem',
        borderBottom: `1px solid ${hi ? 'rgba(255,255,255,.1)' : 'var(--border)'}`,
        position: 'relative',
      }}>
        {/* Tier illustration */}
        <div style={{ marginBottom: '1rem' }}>
          <TierBonsai tier={plan.tier} highlight={hi} />
        </div>

        {plan.badge && (
          <span style={{
            display: 'inline-block', marginBottom: '.55rem',
            fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', padding: '.22rem .6rem',
            borderRadius: 99, background: 'var(--c)', color: 'var(--t-primary)',
          }}>
            {plan.badge}
          </span>
        )}

        <p style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: '1.1rem',
                    color: hi ? '#fff' : 'var(--t-primary)', margin: '0 0 .3rem' }}>
          {plan.name}
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: '.5rem' }}>
          <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: '2.1rem',
                         color: hi ? '#fff' : 'var(--t-primary)' }}>{plan.price}</span>
          <span style={{ fontSize: '.75rem',
                         color: hi ? 'rgba(255,255,255,.5)' : 'var(--t-tertiary)' }}>{plan.period}</span>
        </div>

        <p style={{ fontSize: '.77rem', lineHeight: 1.55,
                    color: hi ? 'rgba(255,255,255,.65)' : 'var(--t-secondary)', margin: 0 }}>
          {plan.desc}
        </p>
      </div>

      {/* Features */}
      <ul style={{ flex: 1, padding: '1.1rem 1.6rem',
                   display: 'flex', flexDirection: 'column', gap: '.5rem', listStyle: 'none', margin: 0 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.78rem',
                               color: hi ? 'rgba(255,255,255,.8)' : 'var(--t-primary)' }}>
            <span style={{ color: hi ? 'var(--c)' : 'var(--c)',
                           marginTop: 1, flexShrink: 0, fontSize: '.7rem' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div style={{ padding: '1rem 1.6rem 1.6rem' }}>
        <button
          onClick={handleCta}
          disabled={isCurrent || isLoading}
          style={{
            width: '100%', padding: '.7rem', border: 'none',
            borderRadius: 'var(--r-md)', fontFamily: 'var(--font-ui)',
            fontSize: '.83rem', fontWeight: 600,
            cursor: isCurrent || isLoading ? 'default' : 'pointer',
            background: isCurrent ? 'var(--surface-3)'
                      : hi       ? 'var(--c)'
                      : plan.ctaPrimary ? 'var(--ink)'
                      : 'transparent',
            color:      isCurrent ? 'var(--t-tertiary)'
                      : hi       ? 'var(--ink)'
                      : plan.ctaPrimary ? '#fff'
                      : 'var(--t-primary)',
            outline:    (!hi && !plan.ctaPrimary && !isCurrent) ? '1px solid var(--border)' : 'none',
            opacity:    isCurrent ? .6 : isLoading ? .8 : 1,
            display:    'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'opacity var(--t-fast)',
          }}
          onMouseEnter={e => { if (!isCurrent && !isLoading) e.currentTarget.style.opacity = '.82' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = isCurrent ? '.6' : isLoading ? '.8' : '1' }}>
          {isLoading && (
            <span style={{
              display: 'inline-block', width: 13, height: 13,
              borderRadius: '50%',
              border: `2px solid ${hi ? 'rgba(14,17,16,.3)' : 'var(--border-2)'}`,
              borderTopColor: hi ? 'var(--ink)' : 'var(--c)',
              animation: 'spin .7s linear infinite',
            }} />
          )}
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}

/* ── Tier bonsai illustrations ────────────────────────────────────────────── */
function TierBonsai({ tier, highlight }) {
  const c = {
    trunk:   highlight ? 'rgba(255,255,255,.35)' : '#7A5F48',
    pot:     highlight ? 'rgba(255,255,255,.2)'  : '#8B6F56',
    leaf1:   highlight ? 'rgba(125,235,160,.55)'  : 'var(--c)',
    leaf2:   highlight ? 'rgba(255,255,255,.3)'  : 'rgba(125,235,160,.6)',
  }

  if (tier === 'free') return (
    <svg width="44" height="48" viewBox="0 0 44 48" fill="none" aria-hidden="true">
      <rect x="15" y="41" width="14" height="6" rx="1.5" fill={c.pot} opacity=".6"/>
      <path d="M22 41 C22 36 22 32 22 28" stroke={c.trunk} strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="22" cy="23" rx="11" ry="9" fill={c.leaf1} opacity=".25"/>
      <ellipse cx="22" cy="23" rx="7"  ry="5.5" fill={c.leaf2} opacity=".35"/>
      <ellipse cx="22" cy="15" rx="5"  ry="4" fill={c.leaf1} opacity=".4"/>
    </svg>
  )

  if (tier === 'pro') return (
    <svg width="52" height="56" viewBox="0 0 52 56" fill="none" aria-hidden="true">
      <path d="M18 50 L34 50 L30 54 L22 54 Z" fill={c.pot} opacity=".55"/>
      <rect x="15" y="47" width="22" height="4" rx="1.5" fill={c.pot} opacity=".4"/>
      <path d="M26 47 C25 41 27 35 26 30 C25 25 23 21 26 18" stroke={c.trunk} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M25 37 C20 33 14 31 10 26" stroke={c.trunk} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M26 33 C31 29 37 27 41 22" stroke={c.trunk} strokeWidth="1.8" strokeLinecap="round"/>
      <ellipse cx="26" cy="13" rx="14" ry="11" fill={c.leaf1} opacity=".22"/>
      <ellipse cx="26" cy="13" rx="10" ry="7.5" fill={c.leaf2} opacity=".38"/>
      <ellipse cx="10" cy="23" rx="9" ry="7" fill={c.leaf1} opacity=".24"/>
      <ellipse cx="10" cy="23" rx="6" ry="4.5" fill={c.leaf2} opacity=".35"/>
      <ellipse cx="41" cy="19" rx="9" ry="7" fill={c.leaf1} opacity=".24"/>
      <ellipse cx="41" cy="19" rx="6" ry="4.5" fill={c.leaf2} opacity=".35"/>
      <ellipse cx="25" cy="5" rx="7" ry="5.5" fill={c.leaf1} opacity=".45"/>
    </svg>
  )

  // supporter
  return (
    <svg width="46" height="52" viewBox="0 0 46 52" fill="none" aria-hidden="true">
      <rect x="14" y="44" width="18" height="6" rx="1.5" fill={c.pot} opacity=".55"/>
      <path d="M23 44 C22 38 24 32 23 27" stroke={c.trunk} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M22 36 C17 32 12 30 9 25" stroke={c.trunk} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M23 33 C28 29 33 27 36 22" stroke={c.trunk} strokeWidth="1.8" strokeLinecap="round"/>
      <ellipse cx="23" cy="20" rx="12" ry="10" fill={c.leaf1} opacity=".22"/>
      <ellipse cx="23" cy="20" rx="8.5" ry="6.5" fill={c.leaf2} opacity=".36"/>
      <ellipse cx="9"  cy="22" rx="7.5" ry="6" fill={c.leaf1} opacity=".24"/>
      <ellipse cx="9"  cy="22" rx="5"   ry="4" fill={c.leaf2} opacity=".34"/>
      <ellipse cx="36" cy="19" rx="7.5" ry="6" fill={c.leaf1} opacity=".24"/>
      <ellipse cx="23" cy="11" rx="6"   ry="5" fill={c.leaf1} opacity=".42"/>
    </svg>
  )
}

/* ── Ghost bonsai watermark (Pro card bg) ─────────────────────────────────── */
function BonsaiWatermark() {
  return (
    <svg width="160" height="180" viewBox="0 0 80 90" fill="none">
      <path d="M40 84 C39 72 41 60 40 50 C39 42 37 36 40 30" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <path d="M40 64 C32 56 22 52 16 44" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M40 58 C48 51 57 47 63 39" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="40" cy="22" rx="22" ry="17" fill="white" opacity=".5"/>
      <ellipse cx="40" cy="22" rx="15" ry="12" fill="white" opacity=".4"/>
      <ellipse cx="16" cy="40" rx="13" ry="11" fill="white" opacity=".4"/>
      <ellipse cx="63" cy="36" rx="13" ry="11" fill="white" opacity=".4"/>
      <ellipse cx="39" cy="8"  rx="9"  ry="7"  fill="white" opacity=".5"/>
    </svg>
  )
}

/* ── Arrow icon ───────────────────────────────────────────────────────────── */
const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2L3 7l5 5"/><path d="M3 7h8"/>
  </svg>
)

/* ── Plan data ────────────────────────────────────────────────────────────────
   Ladder is deliberately a strict superset going up: everything in a lower
   tier is still true in the one above it. Free is watermarked — that's the
   one boundary that's actually enforceable in a 100% client-side product,
   since batch caps and account state can't be. Supporter removes it;
   Pro adds the manual editor on top of everything Supporter has. */
const PLANS = [
  {
    tier: 'free', name: 'Free', price: '$0', period: 'forever',
    badge: null, highlight: false, ctaPrimary: false,
    desc: 'Smart Mode compression — no account needed, full quality.',
    cta: 'Start compressing',
    features: [
      'Smart Mode (preset compression)',
      'Up to 15 images per batch',
      'JPEG, PNG, WebP, AVIF',
      'Before / after comparison',
      '4 compression presets',
      'ZIP + individual download',
      '72-hour compression history',
      '100% browser-based — nothing uploaded',
      'Exports include a subtle Bonsai watermark',
    ],
  },
  {
    tier: 'supporter', name: 'Supporter', price: '$0.05', period: '/month',
    badge: null, highlight: false, ctaPrimary: false,
    desc: 'Remove the watermark and the batch cap. Nothing else changes.',
    cta: 'Remove watermark',
    features: [
      'Everything in Free',
      'No watermark on exports',
      'Unlimited images in Smart Mode',
      'No cap on batch size',
      'Early access to new tools',
    ],
  },
  {
    tier: 'pro', name: 'Pro', price: '$1', period: '/month',
    badge: 'Most popular', highlight: true, ctaPrimary: true,
    desc: 'Everything in Supporter, plus full manual control for professional work.',
    cta: 'Upgrade to Pro',
    features: [
      'Everything in Supporter',
      'Pro Mode — per-image editor',
      'Unlimited images in Pro Mode',
      'Live before/after preview',
      'Quality · blur · sharpen · resize sliders',
      'Format conversion (WebP, AVIF, JPEG, PNG)',
      'Compress in background while editing next',
      'Auto-download on completion',
      'Permanent compression history',
      'Re-download any past batch',
    ],
  },
]
