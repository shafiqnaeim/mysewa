import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ToastProvider } from './context/ToastContext'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminDatabasePage from './pages/AdminDatabasePage'
import AdminLogsPage from './pages/AdminLogsPage'
import AdminMySettingsPage from './pages/AdminMySettingsPage'
import AdminNotificationsPage from './pages/AdminNotificationsPage'
import AdminPropertiesPage from './pages/AdminPropertiesPage'
import AdminAccountPage from './pages/AdminAccountPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminBookingsPage from './pages/AdminBookingsPage'
import AdminPaymentsPage from './pages/AdminPaymentsPage'
import AdminReportsPage from './pages/AdminReportsPage'
import AdminVerificationPage from './pages/AdminVerificationPage'
import DashboardRouterPage from './pages/DashboardRouterPage'
import LandlordDashboardPage from './pages/LandlordDashboardPage'
import LandlordMyPropertiesPage from './pages/LandlordMyPropertiesPage'
import LandlordApplicationsPage from './pages/LandlordApplicationsPage'
import LandlordPaymentsPage from './pages/LandlordPaymentsPage'
import LandlordReviewsPage from './pages/LandlordReviewsPage'
import LandlordReportsPage from './pages/LandlordReportsPage'
import LandlordAddPropertyPage from './pages/LandlordAddPropertyPage'
import LandlordPropertyDetailPage from './pages/LandlordPropertyDetailPage'
import LandlordMyAccountPage from './pages/LandlordMyAccountPage'
import LandlordVerificationPage from './pages/LandlordVerificationPage'
import LandingPage from './pages/LandingPage'
import StudentMyAccountPage from './pages/StudentMyAccountPage'
import StudentMyDashboardPage from './pages/StudentMyDashboardPage'
import StudentMyPropertyPage from './pages/StudentMyPropertyPage'
import StudentBookingsPage from './pages/StudentBookingsPage'
import StudentPaymentsPage from './pages/StudentPaymentsPage'
import StudentReviewsPage from './pages/StudentReviewsPage'
import StudentSavedPropertiesPage from './pages/StudentSavedPropertiesPage'
import StudentVerificationPage from './pages/StudentVerificationPage'
import StudentReportsPage from './pages/StudentReportsPage'
import StudentPropertySearchPage from './pages/StudentPropertySearchPage'
import StudentPropertyDetailPage from './pages/StudentPropertyDetailPage'
import MyPropertiesPage from './pages/MyPropertiesPage'
import MonthlyRentTrackerPage from './pages/MonthlyRentTrackerPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

export default function App() {
  return (
    <ToastProvider>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/properties" element={<StudentPropertySearchPage />} />
      <Route path="/properties/:id" element={<StudentPropertyDetailPage />} />
      <Route path="/dashboard" element={<DashboardRouterPage />} />
      <Route path="/dashboard/student/account" element={<StudentMyAccountPage />} />
      <Route path="/dashboard/student/property" element={<StudentMyPropertyPage />} />
      <Route path="/dashboard/student/bookings" element={<StudentBookingsPage />} />
      <Route path="/dashboard/student/payments" element={<StudentPaymentsPage />} />
      <Route path="/dashboard/student/reviews" element={<StudentReviewsPage />} />
      <Route path="/dashboard/student/saved" element={<StudentSavedPropertiesPage />} />
      <Route path="/dashboard/student/reports" element={<StudentReportsPage />} />
      <Route path="/dashboard/student/verification" element={<StudentVerificationPage />} />
      <Route path="/dashboard/student/rent" element={<Navigate to="/dashboard/student/property" replace />} />
      <Route path="/dashboard/student/rent-tracker/:bookingId" element={<MonthlyRentTrackerPage />} />
      <Route path="/dashboard/student" element={<StudentMyDashboardPage />} />
      <Route path="/dashboard/landlord" element={<LandlordDashboardPage />} />
      <Route path="/dashboard/landlord/properties" element={<LandlordMyPropertiesPage />} />
      <Route path="/dashboard/landlord/properties/new" element={<LandlordAddPropertyPage />} />
      <Route path="/dashboard/landlord/properties/:propertyId/edit" element={<LandlordAddPropertyPage />} />
      <Route path="/dashboard/landlord/properties/:propertyId" element={<LandlordPropertyDetailPage />} />
      <Route path="/dashboard/landlord/applications" element={<LandlordApplicationsPage />} />
      <Route path="/dashboard/landlord/rent-tracker/:bookingId" element={<MonthlyRentTrackerPage />} />
      <Route path="/dashboard/landlord/payments" element={<LandlordPaymentsPage />} />
      <Route path="/dashboard/landlord/reviews" element={<LandlordReviewsPage />} />
      <Route path="/dashboard/landlord/reports" element={<LandlordReportsPage />} />
      <Route path="/dashboard/landlord/account" element={<LandlordMyAccountPage />} />
      <Route path="/dashboard/landlord/verification" element={<LandlordVerificationPage />} />
      <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
      <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
      <Route path="/dashboard/admin/properties" element={<AdminPropertiesPage />} />
      <Route path="/dashboard/admin/verification" element={<AdminVerificationPage />} />
      <Route path="/dashboard/admin/bookings" element={<AdminBookingsPage />} />
      <Route path="/dashboard/admin/payments" element={<AdminPaymentsPage />} />
      <Route path="/dashboard/admin/reports" element={<AdminReportsPage />} />
      <Route path="/dashboard/admin/database" element={<AdminDatabasePage />} />
      <Route path="/dashboard/admin/settings" element={<AdminMySettingsPage />} />
      <Route path="/dashboard/admin/logs" element={<AdminLogsPage />} />
      <Route path="/dashboard/admin/notifications" element={<AdminNotificationsPage />} />
      <Route path="/dashboard/admin/account" element={<AdminAccountPage />} />
      <Route path="/admin" element={<Navigate to="/dashboard/admin" replace />} />
      <Route path="/admin/universities" element={<Navigate to="/dashboard/admin/settings" replace />} />
      <Route path="/admin/settings" element={<Navigate to="/dashboard/admin/settings" replace />} />
      <Route path="/admin/database" element={<Navigate to="/dashboard/admin/database" replace />} />
      <Route path="/my-properties" element={<MyPropertiesPage />} />
      <Route path="/my-properties/rent/:applicationId" element={<MonthlyRentTrackerPage />} />
      <Route path="/login" element={<SignInPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/register" element={<SignUpPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ToastProvider>
  )
}
