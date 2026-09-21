import { useAppContext } from '../context/AppContext'

/**
 * Returns the cabinet_id from the authenticated user's profile.
 * The profile is already loaded at login in AppContext, so this
 * hook avoids an extra Supabase call.
 */
export function useCabinetId() {
  const { profile, clinicId, cabinetId } = useAppContext()
  const effectiveId = clinicId || cabinetId || profile?.clinic_id || profile?.cabinet_id || null
  return {
    cabinetId: effectiveId,
    clinicId: effectiveId,
    loading: !profile,
  }
}
