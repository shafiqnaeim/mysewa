import { useEffect, useMemo, useState } from 'react'
import LandlordLayout from '../components/LandlordLayout'
import { useToast } from '../context/ToastContext'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import {
  buildLandlordReportsData,
  fetchLandlordDashboardData,
} from '../services/landlordDashboardApi'
import Reports from './dashboard/Reports'

export default function LandlordReportsPage() {
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()

  const [rawData, setRawData] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [dateFilter, setDateFilter] = useState('30d')

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      setFetchError('Please sign in again.')
      setDataLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setDataLoading(true)
      setFetchError('')
      try {
        const data = await fetchLandlordDashboardData(user.id, token)
        if (!cancelled) setRawData(data)
      } catch (e) {
        if (!cancelled) {
          setRawData(null)
          setFetchError(e.message || 'Could not load reports.')
        }
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const reportData = useMemo(() => {
    if (!rawData) return null
    return buildLandlordReportsData(rawData, dateFilter)
  }, [rawData, dateFilter])

  function handleExport() {
    pushToast({ message: 'Report export will be available in a future update.', type: 'info' })
  }

  if (authLoading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[#A0AEC0]">Loading reports…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (authError) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <Reports
        loading={dataLoading}
        error={fetchError}
        hasData={reportData?.hasData ?? false}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        summaryStats={reportData?.summaryStats ?? []}
        earningsData={reportData?.earningsData ?? []}
        bookingsData={reportData?.bookingsData ?? []}
        propertyRows={reportData?.propertyRows ?? []}
        transactionRows={reportData?.transactionRows ?? []}
        insights={reportData?.insights ?? []}
        onExport={handleExport}
      />
    </LandlordLayout>
  )
}
