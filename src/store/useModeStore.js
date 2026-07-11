// useModeStore.js
// Single source of truth for Smart/Pro mode and user tier.
// isPro: false = free user (no auth yet — flip to true when payment is integrated)
// mode: 'smart' | 'pro' — persisted in localStorage

import { create } from 'zustand'

const STORAGE_KEY = 'bonsai_mode_v1'

function loadMode() {
  try { return localStorage.getItem(STORAGE_KEY) === 'pro' ? 'pro' : 'smart' }
  catch { return 'smart' }
}

function saveMode(mode) {
  try { localStorage.setItem(STORAGE_KEY, mode) } catch {}
}

// Trial exports counter — free users get 1 export trial from Pro Mode
const TRIAL_KEY = 'bonsai_trial_exports_v1'
function getTrialCount() {
  try { return Number(localStorage.getItem(TRIAL_KEY) ?? '0') } catch { return 0 }
}
function incrementTrial() {
  try { localStorage.setItem(TRIAL_KEY, String(getTrialCount() + 1)) } catch {}
}

export const useModeStore = create((set, get) => ({
  mode:  loadMode(),   // 'smart' | 'pro'
  
  setMode: (mode) => {
    saveMode(mode)
    set({ mode })
  },

  // Use a trial export (Pro Mode, free user, ≤1 trial remaining)
  hasTrialExport: () => getTrialCount() < 1,
  useTrial: () => incrementTrial(),

}))
