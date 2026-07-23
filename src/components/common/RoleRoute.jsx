import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { Loader2 } from 'lucide-react'

/**
 * RoleRoute — protects routes by checking auth + role.
 * 
 * Usage:
 *   <RoleRoute allowedRoles={['docteur']}>
 *     <DoctorDashboard />
 *   </RoleRoute>
 * 
 * If user is not authenticated → redirect to /login
 * If user role is not in allowedRoles → redirect to their correct dashboard
 */
function RoleRoute({ allowedRoles, children }) {
  const { isAuthenticated, isInitializing, role } = useAppContext()

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(role)) {
    const redirectTo = role === 'secretaire' ? '/salle-attente' : '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export default RoleRoute

