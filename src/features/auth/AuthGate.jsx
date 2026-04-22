/**
 * src/features/auth/AuthGate.jsx
 * Wraps Pro-only surfaces. Non-Pro users see UpgradePrompt instead.
 */
import { useAuthStore } from '../../store/useAuthStore'
import UpgradePrompt   from './UpgradePrompt'

export default function AuthGate({ children, feature = 'Pro Mode' }) {
  const plan  = useAuthStore(s => s.plan)
  const isPro = plan === 'pro'

  if (isPro) return <>{children}</>
  return <UpgradePrompt feature={feature} />
}
