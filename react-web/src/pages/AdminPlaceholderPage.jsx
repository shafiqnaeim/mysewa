import { useLocation } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { useAdminGuard } from '../hooks/useAdminGuard'

const PAGE_META = {
  '/dashboard/admin/users': { title: 'Users', description: 'Manage student and landlord accounts.' },
  '/dashboard/admin/properties': { title: 'Properties', description: 'Review and manage all property listings.' },
  '/dashboard/admin/verification': { title: 'Verify Listings', description: 'Approve or reject listings pending verification.' },
  '/dashboard/admin/bookings': { title: 'Bookings', description: 'Monitor rental applications and bookings platform-wide.' },
  '/dashboard/admin/payments': { title: 'Payments', description: 'View deposits, rent payments, and transactions.' },
  '/dashboard/admin/reports': { title: 'Reports', description: 'Platform analytics and issue reports.' },
  '/dashboard/admin/logs': { title: 'System Logs', description: 'Audit trail and system activity.' },
  '/dashboard/admin/notifications': { title: 'Notifications', description: 'Broadcast and manage system notifications.' },
  '/dashboard/admin/account': { title: 'My Account', description: 'Administrator profile and security settings.' },
}

export default function AdminPlaceholderPage() {
  const location = useLocation()
  const { loading, error } = useAdminGuard()
  const meta = PAGE_META[location.pathname] || { title: 'Admin', description: '' }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{meta.title}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">{meta.description}</p>
        <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-[#4B5563]">This section is coming soon.</p>
        </div>
      </div>
    </AdminLayout>
  )
}
