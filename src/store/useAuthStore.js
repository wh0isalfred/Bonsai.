/**
 * useAuthStore — Bonsai global auth + plan state
 *
 * Wraps Supabase auth so every component can read:
 *   session, user, plan ('free' | 'supporter' | 'pro'), loading
 *
 * And call:
 *   signIn, signUp, signInWithGoogle, signOut, init
 *
 * Call useAuthStore.getState().init() once in main.jsx (or App).
 */
import { create } from 'zustand'
import { supabase, isSupabaseReady } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  session: null,
  user:    null,
  profile: null,
  plan:    'free',   // 'free' | 'supporter' | 'pro'
  loading: true,

  // ── Derived helpers ────────────────────────────────────────────────
  isPro:       () => get().plan === 'pro',
  isSupporter: () => ['supporter', 'pro'].includes(get().plan),
  isLoggedIn:  () => !!get().session,

  // ── Init (call once at app startup) ───────────────────────────────
  init: async () => {
    if (!isSupabaseReady()) { set({ loading: false }); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      set({ session, user: session.user })
      await get()._fetchProfile(session.user.id)
    }
    set({ loading: false })

    // Listen for auth state changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        await get()._fetchProfile(session.user.id)
      } else {
        set({ profile: null, plan: 'free' })
      }
    })
  },

  // ── Internal profile fetch ─────────────────────────────────────────
  _fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, plan, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('[Bonsai] Profile fetch error:', error.message)
      return
    }
    set({ profile: data, plan: data?.plan ?? 'free' })
  },

  // ── Auth actions ───────────────────────────────────────────────────
  signIn: async (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signUp: async (email, password) =>
    supabase.auth.signUp({ email, password }),

  signInWithGoogle: async () =>
    supabase.auth.signInWithOAuth({
      provider:  'google',
      options:   { redirectTo: window.location.origin },
    }),

  signInWithMagicLink: async (email) =>
    supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, plan: 'free' })
  },

  // ── History helpers ─────────────────────────────────────────────────
  /**
   * Resolves expires_at for a new history item based on user's plan.
   * Free users → 72 hours. Pro users → null (permanent).
   */
  historyExpiresAt: () => {
    if (get().plan === 'pro') return null
    const d = new Date()
    d.setHours(d.getHours() + 72)
    return d.toISOString()
  },
}))

// Kick off init automatically when the module is imported
useAuthStore.getState().init()
