import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ToastProvider } from './context/ToastContext'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminDatabasePage from './pages/AdminDatabasePage'
import AdminMySettingsPage from './pages/AdminMySettingsPage'
import DashboardRouterPage from './pages/DashboardRouterPage'
import LandlordDashboardPage from './pages/LandlordDashboardPage'
import LandlordMyAccountPage from './pages/LandlordMyAccountPage'
import LandingPage from './pages/LandingPage'
import StudentMyAccountPage from './pages/StudentMyAccountPage'
import StudentMyDashboardPage from './pages/StudentMyDashboardPage'
import StudentMyPropertyPage from './pages/StudentMyPropertyPage'
import MyPropertiesPage from './pages/MyPropertiesPage'
import LandlordRentCalendarPage from './pages/LandlordRentCalendarPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

export default function App() {
  return (
    <ToastProvider>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardRouterPage />} />
      <Route path="/dashboard/student/account" element={<StudentMyAccountPage />} />
      <Route path="/dashboard/student/property" element={<StudentMyPropertyPage />} />
      <Route path="/dashboard/student/rent" element={<Navigate to="/dashboard/student/property" replace />} />
      <Route path="/dashboard/student" element={<StudentMyDashboardPage />} />
      <Route path="/dashboard/landlord" element={<LandlordDashboardPage />} />
      <Route path="/dashboard/landlord/account" element={<LandlordMyAccountPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/universities" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/admin/settings" element={<AdminMySettingsPage />} />
      <Route path="/admin/database" element={<AdminDatabasePage />} />
      <Route path="/my-properties" element={<MyPropertiesPage />} />
      <Route path="/my-properties/rent/:applicationId" element={<LandlordRentCalendarPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ToastProvider>
  )
}
