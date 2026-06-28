import { useMemo } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import LandlordDashboard from './dashboard/LandlordDashboard'

export default function LandlordDashboardPage() {
  const { user, loading, error } = useLandlordGuard()

  const displayName = useMemo(() => {
    const full = String(user?.fullName || '').trim()
    if (full) return full
    return 'Encik Hassan'
  }, [user?.fullName])

  if (loading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA] font-sans text-[#2D3748]">
          <p className="text-sm font-medium">Loading your dashboard…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (error) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <LandlordDashboard landlordName={displayName} landlordId={user?.id} />
    </LandlordLayout>
  )
}
