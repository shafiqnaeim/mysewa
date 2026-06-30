import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../../components/StudentLayout'
import ReportCard from '../../components/ReportCard'
import ReportForm from '../../components/ReportForm'
import { useStudentGuard } from '../../hooks/useStudentGuard'
import { useToast } from '../../context/ToastContext'
import {
  fetchStudentMaintenanceReports,
  resolveMaintenanceReport,
  submitMaintenanceReport,
} from '../../services/maintenanceReportService'

export default function StudentReports() {
  const navigate = useNavigate()
  const { user, loading: authLoading, error: authError } = useStudentGuard()
  const { pushToast } = useToast()

  const [applications, setApplications] = useState([])
  const [reports, setReports] = useState([])
  const [propertyName, setPropertyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resolveSavingId, setResolveSavingId] = useState(null)
  const [formKey, setFormKey] = useState(0)

  const primaryApplication = useMemo(() => {
    const accepted = applications.filter(
      (a) => String(a.status || '').toLowerCase() === 'accepted' && a.propertyId != null,
    )
    if (!accepted.length) return null
    return [...accepted].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return tb - ta
    })[0]
  }, [applications])

  const hasTenancy = Boolean(primaryApplication?.propertyId)

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const [appsRes, reportsData] = await Promise.all([
        fetch('/api/v1/applications/for-student', { headers: { Authorization: `Bearer ${token}` } }),
        fetchStudentMaintenanceReports(token),
      ])
      const appsData = await appsRes.json().catch(() => ({}))
      if (appsRes.ok) {
        setApplications(Array.isArray(appsData.items) ? appsData.items : [])
      }
      setReports(Array.isArray(reportsData.items) ? reportsData.items : [])
    } catch (e) {
      setReports([])
      pushToast({ message: e.message || 'Could not load reports.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, pushToast])

  useEffect(() => {
    if (user?.id) loadData()
  }, [user?.id, loadData])

  useEffect(() => {
    const pid = primaryApplication?.propertyId
    if (!pid) {
      setPropertyName('')
      return
    }
    let cancelled = false
    async function loadProp() {
      try {
        const res = await fetch(`/api/v1/properties/${encodeURIComponent(pid)}`)
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          const item = data.item
          setPropertyName(item?.title || item?.name || primaryApplication.propertyName || '')
        }
      } catch {
        if (!cancelled) setPropertyName('')
      }
    }
    loadProp()
    return () => {
      cancelled = true
    }
  }, [primaryApplication])

  async function handleSubmit(payload) {
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    setSubmitting(true)
    try {
      await submitMaintenanceReport(payload, token)
      pushToast({ message: 'Your report has been submitted.', type: 'success' })
      setFormKey((k) => k + 1)
      await loadData()
    } catch (e) {
      pushToast({ message: e.message || 'Could not submit report.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResolve(report) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !report?.id) return
    setResolveSavingId(report.id)
    try {
      await resolveMaintenanceReport(report.id, token)
      pushToast({ message: 'Your issue has been marked as resolved.', type: 'success' })
      await loadData()
    } catch (e) {
      pushToast({ message: e.message || 'Could not mark resolved.', type: 'error' })
    } finally {
      setResolveSavingId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#718096]">Loading maintenance reports…</p>
        </div>
      </StudentLayout>
    )
  }

  if (authError) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-[#1A1A2E]">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
          <header>
            <h1 className="text-2xl font-bold text-[#2D3748] sm:text-3xl">
              <span aria-hidden="true">🔧 </span>
              Maintenance Reports
            </h1>
            <p className="mt-2 text-sm text-[#718096]">
              Report issues to your landlord and track repair status
            </p>
          </header>

          {!hasTenancy ? (
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-[#2D3748]">You need an approved booking first</p>
              <p className="mt-2 text-sm text-[#718096]">Browse properties and apply to get started</p>
              <button
                type="button"
                onClick={() => navigate('/properties')}
                className="mt-6 rounded-xl bg-[#6C2BD9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6]"
              >
                Browse Properties
              </button>
            </section>
          ) : (
            <>
              <ReportForm
                key={formKey}
                propertyId={primaryApplication.propertyId}
                propertyName={propertyName}
                submitting={submitting}
                onSubmit={handleSubmit}
              />

              <section>
                <h2 className="text-lg font-bold text-[#2D3748]">
                  <span aria-hidden="true">📋 </span>
                  Your Reports
                </h2>
                <div className="mt-4 space-y-4">
                  {reports.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#718096]">
                      No maintenance reports yet.
                    </p>
                  ) : (
                    reports.map((report, index) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        role="student"
                        index={index}
                        saving={resolveSavingId === report.id}
                        onResolve={handleResolve}
                      />
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  )
}
