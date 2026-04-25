/**
 * supabase/functions/stripe-webhook/index.ts
 *
 * Listens for Stripe events and keeps the Supabase `profiles` table in sync.
 *
 * Events handled:
 *   checkout.session.completed     — payment succeeded, activate plan
 *   customer.subscription.updated  — plan change or renewal
 *   customer.subscription.deleted  — cancellation, downgrade to free
 *   invoice.payment_failed         — payment failed (optional: notify user)
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET    — whsec_... (from Stripe Dashboard → Webhooks)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * IMPORTANT: This function uses the SERVICE ROLE KEY because it needs to
 * update profiles server-side without a user JWT. Keep this secret safe —
 * never expose it to the browser.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe    from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')              ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

/* ── Price ID → plan name mapping ────────────────────────────────────
   These must match the Price IDs in your Stripe dashboard.
   They're read from environment variables so you can use test/live
   keys without changing code. */
function priceIdToPlan(priceId: string): 'pro' | 'supporter' | null {
  const PRO_PRICE_ID       = Deno.env.get('STRIPE_PRO_PRICE_ID')       ?? ''
  const SUPPORTER_PRICE_ID = Deno.env.get('STRIPE_SUPPORTER_PRICE_ID') ?? ''

  if (priceId === PRO_PRICE_ID)       return 'pro'
  if (priceId === SUPPORTER_PRICE_ID) return 'supporter'
  return null
}

serve(async (req) => {
  /* ── 1. Verify Stripe signature ──────────────────────────────────
     Without this check, anyone could call this endpoint and
     fake a payment. Stripe signs every webhook with a secret. */
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.error('[webhook] Missing stripe-signature header')
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    )
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message)
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 })
  }

  console.log(`[webhook] Received: ${event.type}`)

  /* ── 2. Handle events ────────────────────────────────────────────── */
  try {
    switch (event.type) {

      /* ── Checkout completed — payment succeeded ─────────────────── */
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        /* Only handle subscription checkouts */
        if (session.mode !== 'subscription') break

        const customerId     = session.customer as string
        const subscriptionId = session.subscription as string

        /* Get the subscription to find which price was purchased */
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId      = subscription.items.data[0]?.price.id
        const plan         = priceIdToPlan(priceId)

        if (!plan) {
          console.warn('[webhook] Unknown price ID:', priceId)
          break
        }

        /* Find the Supabase user by Stripe customer ID */
        const userId = session.metadata?.supabase_user_id
          ?? await getUserIdByCustomerId(customerId)

        if (!userId) {
          console.error('[webhook] Could not find user for customer:', customerId)
          break
        }

        /* Update their plan */
        const { error } = await supabase
          .from('profiles')
          .update({
            plan:                   plan,
            stripe_id:              customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', userId)

        if (error) {
          console.error('[webhook] Failed to update plan:', error)
        } else {
          console.log(`[webhook] User ${userId} upgraded to ${plan}`)
        }
        break
      }

      /* ── Subscription updated — renewal or plan change ──────────── */
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId   = subscription.customer as string
        const priceId      = subscription.items.data[0]?.price.id
        const plan         = priceIdToPlan(priceId)

        const userId = await getUserIdByCustomerId(customerId)
        if (!userId) break

        /* Only update if it's a known plan.
           If plan is null, the price changed to something unrecognised —
           safer to leave the current plan than to downgrade. */
        if (plan) {
          await supabase
            .from('profiles')
            .update({ plan, stripe_subscription_id: subscription.id })
            .eq('id', userId)

          console.log(`[webhook] User ${userId} plan updated to ${plan}`)
        }

        /* Handle subscription status — if payment is past_due or unpaid,
           downgrade to free to protect the product */
        if (
          subscription.status === 'past_due' ||
          subscription.status === 'unpaid'   ||
          subscription.status === 'incomplete_expired'
        ) {
          await downgradeToFree(userId)
          console.log(`[webhook] User ${userId} downgraded — subscription ${subscription.status}`)
        }

        break
      }

      /* ── Subscription cancelled ──────────────────────────────────── */
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId   = subscription.customer as string
        const userId       = await getUserIdByCustomerId(customerId)

        if (!userId) break

        await downgradeToFree(userId)
        console.log(`[webhook] User ${userId} downgraded to free — subscription cancelled`)
        break
      }

      /* ── Payment failed ──────────────────────────────────────────── */
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const userId     = await getUserIdByCustomerId(customerId)

        /* Log it — Stripe will retry and send emails automatically.
           We only downgrade after the subscription moves to past_due
           which is handled in customer.subscription.updated above. */
        if (userId) {
          console.warn(`[webhook] Payment failed for user ${userId}`)
        }
        break
      }

      default:
        /* Ignore all other events */
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

  } catch (err) {
    console.error('[webhook] Handler error:', err)
    /* Return 500 so Stripe retries the webhook */
    return new Response('Handler error', { status: 500 })
  }

  /* Always return 200 so Stripe knows we received the event */
  return new Response(JSON.stringify({ received: true }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
})

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Look up a Supabase user ID from a Stripe customer ID */
async function getUserIdByCustomerId(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_id', customerId)
    .single()

  if (error || !data) {
    /* Try fetching from Stripe customer metadata as fallback */
    try {
      const customer = await stripe.customers.retrieve(customerId)
      if ('deleted' in customer) return null
      return (customer as Stripe.Customer).metadata?.supabase_user_id ?? null
    } catch {
      return null
    }
  }

  return data.id
}

/** Reset a user's plan to free and clear subscription ID */
async function downgradeToFree(userId: string) {
  await supabase
    .from('profiles')
    .update({
      plan:                   'free',
      stripe_subscription_id: null,
    })
    .eq('id', userId)
}
