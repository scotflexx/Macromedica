import { normalizeRole } from './rbac'

/** True when an invited secretary still needs the welcome / password setup step. */
export function needsSecretaryOnboarding(user, profile) {
  const role = normalizeRole(profile?.role || user?.user_metadata?.role)
  if (role !== 'secretary') return false
  if (user?.user_metadata?.onboarding_complete === true) return false

  const nom = String(profile?.nom_complet || user?.user_metadata?.nom_complet || '').trim()
  const emailPrefix = String(user?.email || '').split('@')[0]?.toLowerCase()
  if (nom && nom.toLowerCase() !== emailPrefix && nom.split(/\s+/).length >= 2) {
    return false
  }

  return true
}
