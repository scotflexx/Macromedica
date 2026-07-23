import { Navigate, Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { Loader2 } from 'lucide-react'
import { can, hasRoleAccess, normalizeRole } from '../../lib/rbac'

export default function RoleGuard({ role, roles, permission, redirectTo = '/dashboard', children }) {
  const { isAuthenticated, isInitializing, role: userRole, canonicalRole } = useAppContext()

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const currentRole = canonicalRole || normalizeRole(userRole)

  if (permission && !can(currentRole, permission)) {
    return <Navigate to={redirectTo} replace />
  }

  const allowedRoles = roles ?? (role ? [role] : [])
  if (allowedRoles.length > 0 && !hasRoleAccess(currentRole, allowedRoles)) {
    return <Navigate to={redirectTo} replace />
  }

  return children ? children : <Outlet />
}
