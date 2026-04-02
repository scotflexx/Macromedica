import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RoleGuard from './components/common/RoleGuard'
import ProtectedRoute from './components/common/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerificationPage from './pages/VerificationPage'
import LandingPage from './pages/LandingPage'


// Shared pages
import AppointmentsPage from './pages/dashboard/AppointmentsPage'
import BillingPage from './pages/dashboard/BillingPage'
import PatientsPage from './pages/dashboard/PatientsPage'
import StatisticsPage from './pages/dashboard/StatisticsPage'
import StaffManagementPage from './pages/dashboard/StaffManagementPage'
import SettingsPage from './pages/dashboard/SettingsPage'

// Role-specific workspaces
import ConsultationWorkspace from './pages/dashboard/ConsultationWorkspace'
import AiScribePage from './pages/AiScribePage'

// Role redirect component based on new requirements
import { useAppContext } from './context/AppContext'
import SecretaireDashboard from './dashboards/SecretaireDashboard'

function RootRedirect() {
  const { isAuthenticated, isInitializing, role } = useAppContext()
  if (isInitializing) return null
  if (!isAuthenticated) return <LandingPage />

  if (role === 'secretaire') {
    return <Navigate to="/secretaire" replace />
  }
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verification" element={<VerificationPage />} />

        {/* Connected App Routes — require authentication */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          {/* SECRÉTAIRE & DOCTEUR (Shared Access) */}
          <Route path="/secretaire" element={<SecretaireDashboard />} />
          <Route path="/agenda" element={<AppointmentsPage />} />
          <Route path="/facturation" element={<BillingPage />} />
          <Route path="/facturation/:id" element={<BillingPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientsPage />} />

          {/* DOCTEUR ONLY ROUTES */}
          <Route
            path="/dashboard"
            element={
              <RoleGuard role="docteur">
                <StatisticsPage />
              </RoleGuard>
            }
          />
          {/* Ordonnances are now inside the patient profile view (tab) */}
          <Route
            path="/equipe"
            element={
              <RoleGuard role="docteur">
                <StaffManagementPage />
              </RoleGuard>
            }
          />
          <Route
            path="/parametres"
            element={
              <RoleGuard role="docteur">
                <SettingsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/consultation/:rdv_id"
            element={
              <RoleGuard role="docteur">
                <ConsultationWorkspace />
              </RoleGuard>
            }
          />
          <Route
            path="/ai-scribe"
            element={
              <RoleGuard role="docteur">
                <AiScribePage />
              </RoleGuard>
            }
          />


          {/* Legacy redirect logic from old /doctor or /secretary routes */}
          <Route path="/doctor/*" element={<Navigate to="/" replace />} />
          <Route path="/secretary/*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
