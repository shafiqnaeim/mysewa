import { useCallback, useEffect, useState } from 'react'
import LandlordLayout from '../../components/LandlordLayout'
import ReportCard from '../../components/ReportCard'
import { useLandlordGuard } from '../../hooks/useLandlordGuard'
import { useToast } from '../../context/ToastContext'
import {
  acknowledgeMaintenanceReport,
  fetchLandlordMaintenanceReports,
  updateMaintenanceReportStatus,
} from '../../services/maintenanceReportService'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
]

export default function LandlordMaintenanceReports() {
  const { user, loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [savingId, setSavingId] = useState(null)
  const [notesById, setNotesById] = useState({})

  const loadReports = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const data = await fetchLandlordMaintenanceReports(token, statusFilter)
      setReports(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setReports([])
      pushToast({ message: e.message || 'Could not load maintenance reports.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, statusFilter, pushToast])

  useEffect(() => {
    if (user?.id) loadReports()
  }, [user?.id, loadReports])

  function getNotes(reportId) {
    return notesById[reportId] ?? ''
  }

  function setNotes(reportId, value) {
    setNotesById((prev) => ({ ...prev, [reportId]: value }))
  }

  async function handleAcknowledge(report) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !report?.id) return
    setSavingId(report.id)
    try {
      await acknowledgeMaintenanceReport(report.id, getNotes(report.id), token)
      pushToast({ message: 'Report acknowledged.', type: 'success' })
      await loadReports()
    } catch (e) {
      pushToast({ message: e.message || 'Could not acknowledge report.', type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  async function handleUpdateStatus(report, status) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !report?.id) return
    setSavingId(report.id)
    try {
      await updateMaintenanceReportStatus(report.id, status, getNotes(report.id), token)
      pushToast({ message: `Status updated to ${status.replace('_', ' ').toLowerCase()}.`, type: 'success' })
      await loadReports()
    } catch (e) {
      pushToast({ message: e.message || 'Could not update status.', type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  if (authLoading) {
    return (
      <LandlordLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[#718096]">Loading…</p>
        </div>
      </LandlordLayout>
    )
  }

  if (authError) {
    return (
      <LandlordLayout>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
          </div>
        </div>
      </LandlordLayout>
    )
  }

  return (
    <LandlordLayout>
      <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
          <header>
            <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
              <span aria-hidden="true">🔧 </span>
              Maintenance Reports
            </h1>
            <p className="mt-2 text-sm text-[#718096]">
              Review tenant issues, acknowledge reports, and update repair status
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  statusFilter === f.value
                    ? 'bg-[#2D3748] text-white'
                    : 'bg-white text-[#4A5568] ring-1 ring-[#E2E8F0] hover:bg-[#F7FAFC]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-[#718096]">Loading reports…</p>
          ) : reports.length === 0 ? (
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-[#2D3748]">No maintenance reports</p>
              <p className="mt-2 text-sm text-[#718096]">
                Reports from accepted tenants will appear here.
              </p>
            </section>
          ) : (
            <div className="space-y-4">
              {reports.map((report, index) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  role="landlord"
                  index={index}
                  saving={savingId === report.id}
                  notesDraft={getNotes(report.id)}
                  onNotesChange={setNotes}
                  onAcknowledge={handleAcknowledge}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </LandlordLayout>
  )
}
