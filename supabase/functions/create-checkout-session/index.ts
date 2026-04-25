/**
 * supabase/functions/create-checkout-session/index.ts
 *
 * Creates a Stripe Checkout session for a given price ID.
 * Called by the frontend when a user clicks "Upgrade to Pro" or "Support Bonsai".
 *
 * Request body:
 *   { priceId: string }
 *
 * Response:
 *   { url: string }  — redirect the user here
 *
 * Environment variables required (set in Supabase Dashboard → Edge Functions → Secrets):
 *   STRIPE_SECRET_KEY       — sk_live_... or sk_test_...
 *   SITE_URL                — https://yourdomain.com  (no trailing slash)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe    from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  /* Handle CORS preflight */
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    /* ── 1. Parse request ────────────────────────────────────────── */
    const { priceId } = await req.json()
    if (!priceId) {
      return json({ error: 'priceId is required' }, 400)
    }

    /* ── 2. Verify user is authenticated ─────────────────────────── */
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Not authenticated' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')          ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      return json({ error: 'Invalid session' }, 401)
    }

    /* ── 3. Get or create Stripe customer ────────────────────────── */
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_id

    if (!customerId) {
      /* Create a new Stripe customer linked to this Supabase user */
      const customer = await stripe.customers.create({
        email:    user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      /* Store the Stripe customer ID on their profile */
      await supabase
        .from('profiles')
        .update({ stripe_id: customerId })
        .eq('id', user.id)
    }

    /* ── 4. Create Checkout Session ──────────────────────────────── */
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ['card'],
      line_items: [{
        price:    priceId,
        quantity: 1,
      }],
      mode:                'subscription',
      /*
       * After payment, Stripe redirects here.
       * ?session_id={CHECKOUT_SESSION_ID} lets us verify on the front-end if needed.
       */
      success_url: `${siteUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}?checkout=cancelled`,
      /*
       * Let Stripe handle promo codes — makes it easy to add discounts later.
       */
      allow_promotion_codes: true,
      /*
       * Pre-fill the email so the user doesn't have to type it again.
       */
      customer_update: {
        address: 'auto',
        name:    'auto',
      },
      metadata: {
        supabase_user_id: user.id,
      },
    })

    return json({ url: session.url })

  } catch (err) {
    console.error('[create-checkout-session]', err)
    return json({ error: err.message ?? 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
