export function normalizeRole(role) {
  const value = String(role || '').toLowerCase()
  if (value === 'admin') return 'admin'
  if (['doctor', 'docteur', 'medecin', 'médecin'].includes(value)) return 'doctor'
  if (['secretary', 'secretaire', 'secrétaire'].includes(value)) return 'secretary'
  return value || 'doctor'
}

export function toLegacyRole(role) {
  const normalized = normalizeRole(role)
  if (normalized === 'doctor') return 'docteur'
  if (normalized === 'secretary') return 'secretaire'
  return normalized
}

export function hasRoleAccess(currentRole, allowedRoles = []) {
  const normalized = normalizeRole(currentRole)
  if (normalized === 'admin') return true
  return allowedRoles.map(normalizeRole).includes(normalized)
}

export const PERMISSIONS = {
  admin: ['*'],
  secretary: [
    'appointments:read',
    'appointments:write',
    'visits:read',
    'visits:queue',
    'visits:cancel',
    'payments:read',
    'payments:write',
  ],
  doctor: [
    'visits:read-own',
    'visits:call-own',
    'consultations:read-own',
    'consultations:write-own',
  ],
}

export function can(role, permission) {
  const normalized = normalizeRole(role)
  const permissions = PERMISSIONS[normalized] || []
  return permissions.includes('*') || permissions.includes(permission)
}
