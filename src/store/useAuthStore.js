import { create } from 'zustand'
import { supabase, isSupabaseReady } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  user:    null,
  profile: null,
  plan:    'free',
  loading: true,

  isPro:       () => get().plan === 'pro',
  isSupporter: () => ['supporter', 'pro'].includes(get().plan),
  isLoggedIn:  () => !!get().session,

  init: async () => {
    if (!isSupabaseReady() || !supabase) {
      set({ loading: false })
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      set({ session, user: session.user })
      await get()._fetchProfile(session.user.id)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        await get()._fetchProfile(session.user.id)
      } else {
        set({ profile: null, plan: 'free' })
      }
    })
  },

  _fetchProfile: async (userId) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id, plan, created_at')
      .eq('id', userId)
      .single()
    if (!error && data) set({ profile: data, plan: data?.plan ?? 'free' })
  },

  signIn: (email, password) =>
    supabase?.auth.signInWithPassword({ email, password })
      ?? Promise.resolve({ error: { message: 'Auth not configured' } }),

  signUp: (email, password) =>
    supabase?.auth.signUp({ email, password })
      ?? Promise.resolve({ error: { message: 'Auth not configured' } }),

  resetPassword: (email) =>
    supabase?.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=1`,
    }) ?? Promise.resolve({ error: { message: 'Auth not configured' } }),

  signOut: async () => {
    await supabase?.auth.signOut()
    set({ session: null, user: null, profile: null, plan: 'free' })
  },

  historyExpiresAt: () => {
    const ttl = ['pro', 'supporter'].includes(get().plan)
      ? 14 * 24 * 60 * 60 * 1000
      : 72 * 60 * 60 * 1000
    return new Date(Date.now() + ttl).toISOString()
  },
}))

useAuthStore.getState().init()
