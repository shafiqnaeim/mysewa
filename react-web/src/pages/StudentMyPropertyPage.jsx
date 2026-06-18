import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import PropertyReviewsSection from '../components/PropertyReviewsSection'
import StudentAccountSiteFooter from '../components/StudentAccountSiteFooter'
import StudentDepositModal from '../components/StudentDepositModal'
import StudentRentPaymentHintModal from '../components/StudentRentPaymentHintModal'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { formatDateShort, monthOverlapsLease, parseLeaseRange } from '../utils/rentCalendarUtils'
import { resolvedStudentDepositAmount } from '../utils/studentApplicationDeposit'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatApplicationWhen(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function formatRmMyr(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return `RM ${Number(amount).toFixed(2)}`
}

function isLandlordDepositConfigured(app) {
  if (!app) return false
  if (app.depositSetByLandlord === true) return true
  const raw = app.landlordDepositAmount ?? app.landlord_deposit_amount
  if (raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) && n > 0
}

function studentReportImageUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return s.startsWith('/') ? s : `/${s}`
}

function studentReportStatusBadgeClass(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'resolved') return 'landlord-myreports-status landlord-myreports-status--resolved'
  if (s === 'received') return 'landlord-myreports-status landlord-myreports-status--received'
  return 'landlord-myreports-status landlord-myreports-status--pending'
}

function studentReportStatusLabel(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s === 'resolved') return 'Resolved'
  if (s === 'received') return 'Received — repair in progress'
  return 'Pending — landlord'
}

export default function StudentMyPropertyPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading, error } = useStudentGuard()
  const { pushToast } = useToast()

  const today = useMemo(() => new Date(), [])
  const [payYear, setPayYear] = useState(() => today.getFullYear())
  const [paidMonths, setPaidMonths] = useState([])
  const [studentRentPaymentLogs, setStudentRentPaymentLogs] = useState([])
  const [rentMonthRecords, setRentMonthRecords] = useState([])
  const [leaseRange, setLeaseRange] = useState(null)
  const [rentCalendarLoading, setRentCalendarLoading] = useState(false)
  const [rentCalendarMonthlyRent, setRentCalendarMonthlyRent] = useState(null)
  const [payRentHintMonth, setPayRentHintMonth] = useState(null)
  const studentRentLeaseClampKeyRef = useRef('')
  const reportFileInputRef = useRef(null)
  const [propertyDetail, setPropertyDetail] = useState(null)
  const [propertyLoading, setPropertyLoading] = useState(false)

  const [reportText, setReportText] = useState('')
  const [reportImage, setReportImage] = useState(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [myReports, setMyReports] = useState([])
  const [myReportsLoading, setMyReportsLoading] = useState(false)
  const [myReportsRefresh, setMyReportsRefresh] = useState(0)
  const [resolveSavingId, setResolveSavingId] = useState(null)

  const [myApplications, setMyApplications] = useState([])
  const [myApplicationsLoading, setMyApplicationsLoading] = useState(false)
  const [depositModalApp, setDepositModalApp] = useState(null)
  const [depositResetAllowed, setDepositResetAllowed] = useState(false)
  const [depositResetSavingId, setDepositResetSavingId] = useState(null)

  const acceptedApplications = useMemo(
    () => myApplications.filter((a) => String(a.status || '').toLowerCase() === 'accepted' && a.propertyId != null),
    [myApplications],
  )

  const primaryApplication = useMemo(() => {
    if (!acceptedApplications.length) return null
    return [...acceptedApplications].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return tb - ta
    })[0]
  }, [acceptedApplications])

  const loadMyReports = useCallback(async () => {
    const pid = primaryApplication?.propertyId
    const token = localStorage.getItem('mysewa_token')
    if (!pid || !token) {
      setMyReports([])
      return
    }
    setMyReportsLoading(true)
    try {
      const res = await fetch(`/api/v1/properties/${encodeURIComponent(pid)}/tenant-reports/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not load your reports (${res.status})`)
      setMyReports(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setMyReports([])
      pushToast({ message: e.message || 'Could not load your reports.', type: 'error' })
    } finally {
      setMyReportsLoading(false)
    }
  }, [primaryApplication?.propertyId, myReportsRefresh, pushToast])

  useEffect(() => {
    void loadMyReports()
  }, [loadMyReports])

  useEffect(() => {
    function onVis() {
      if (document.visibilityState !== 'visible') return
      if (!primaryApplication?.propertyId) return
      setMyReportsRefresh((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [primaryApplication?.propertyId])

  const studentLoggedMonths = useMemo(
    () => studentRentPaymentLogs.map((l) => Number(l.month)).filter((n) => Number.isFinite(n)),
    [studentRentPaymentLogs],
  )

  const reloadApplications = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    try {
      const res = await fetch('/api/v1/applications/for-student', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setMyApplications(Array.isArray(data.items) ? data.items : [])
    } catch {
      /* ignore */
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    async function loadFlags() {
      try {
        const res = await fetch('/api/v1/payments/toyyibpay/options')
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setDepositResetAllowed(Boolean(data.depositResetAllowed))
      } catch {
        if (!cancelled) setDepositResetAllowed(false)
      }
    }
    loadFlags()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('deposit') !== 'return') return
    pushToast({
      message:
        'Returned from ToyyibPay. If payment succeeded, your deposit status should update shortly — refresh if needed.',
      type: 'success',
    })
    setSearchParams({}, { replace: true })
    reloadApplications()
  }, [searchParams, setSearchParams, pushToast, reloadApplications])

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('mysewa_token')
    if (!token) return
    let cancelled = false
    async function load() {
      setMyApplicationsLoading(true)
      try {
        const res = await fetch('/api/v1/applications/for-student', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Failed to load applications (${res.status})`)
        if (!cancelled) setMyApplications(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) {
          setMyApplications([])
          pushToast({ message: e.message || 'Could not load your applications.', type: 'error' })
        }
      } finally {
        if (!cancelled) setMyApplicationsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, pushToast])

  const loadRentCalendar = useCallback(async (opts) => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !primaryApplication?.id) return
    const rawY = opts?.yearOverride
    const year =
      rawY != null && Number.isFinite(Number(rawY)) ? Number(rawY) : payYear
    setRentCalendarLoading(true)
    try {
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(primaryApplication.id)}/rent-months?year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not load rent calendar (${res.status})`)
      if (Array.isArray(data.paidMonths)) setPaidMonths(data.paidMonths.map((n) => Number(n)))
      if (Array.isArray(data.studentRentPaymentLogs)) {
        setStudentRentPaymentLogs(data.studentRentPaymentLogs)
      } else {
        setStudentRentPaymentLogs([])
      }
      if (Array.isArray(data.rentMonthRecords)) setRentMonthRecords(data.rentMonthRecords)
      if (data.monthlyRent != null && Number.isFinite(Number(data.monthlyRent))) {
        setRentCalendarMonthlyRent(Number(data.monthlyRent))
      }
      setLeaseRange(parseLeaseRange(data.preferredMoveIn, data.leaseEnd ?? data.leaseEndDate))
    } catch (e) {
      setPaidMonths([])
      setStudentRentPaymentLogs([])
      setRentMonthRecords([])
      setLeaseRange(null)
      setRentCalendarMonthlyRent(null)
      pushToast({ message: e.message || 'Could not load rent calendar.', type: 'error' })
    } finally {
      setRentCalendarLoading(false)
    }
  }, [primaryApplication?.id, payYear, pushToast])

  useEffect(() => {
    if (searchParams.get('rentToyyibReturn') !== '1') return
    if (!primaryApplication?.id) return
    const y = Number(searchParams.get('year'))
    const validY = Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : null
    pushToast({
      message:
        'Returned from ToyyibPay for rent. If payment succeeded, the calendar should update shortly — refresh if it does not.',
      type: 'success',
    })
    setSearchParams({}, { replace: true })
    if (validY != null) setPayYear(validY)
    void loadRentCalendar(validY != null ? { yearOverride: validY } : undefined)
  }, [
    searchParams,
    setSearchParams,
    pushToast,
    loadRentCalendar,
    primaryApplication?.id,
  ])

  const onRentCalendarSaved = useCallback(() => {
    void loadRentCalendar()
    setPayRentHintMonth(null)
  }, [loadRentCalendar])

  useEffect(() => {
    if (!primaryApplication?.id) {
      setPaidMonths([])
      setStudentRentPaymentLogs([])
      setRentMonthRecords([])
      setLeaseRange(null)
      setRentCalendarMonthlyRent(null)
      setPayRentHintMonth(null)
      studentRentLeaseClampKeyRef.current = ''
      return
    }
    loadRentCalendar()
  }, [primaryApplication?.id, payYear, loadRentCalendar])

  useEffect(() => {
    if (!leaseRange || !primaryApplication?.id) return
    const key = `${primaryApplication.id}-${leaseRange.minY}-${leaseRange.maxY}-${leaseRange.moveIn.getTime()}-${leaseRange.moveOut.getTime()}`
    if (studentRentLeaseClampKeyRef.current === key) return
    studentRentLeaseClampKeyRef.current = key
    setPayYear((y) => Math.min(leaseRange.maxY, Math.max(leaseRange.minY, y)))
  }, [leaseRange, primaryApplication?.id])

  /** When the student returns to this tab, pick up landlord acceptance + deposit saved on the server. */
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      reloadApplications()
      loadRentCalendar()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reloadApplications, loadRentCalendar])

  useEffect(() => {
    const pid = primaryApplication?.propertyId
    if (pid == null) {
      setPropertyDetail(null)
      return
    }
    let cancelled = false
    async function loadProp() {
      setPropertyLoading(true)
      try {
        const res = await fetch(`/api/v1/properties/${encodeURIComponent(pid)}`)
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          const item = data.item
          if (res.ok && item && typeof item === 'object' && item.id != null) setPropertyDetail(item)
          else setPropertyDetail(null)
        }
      } catch {
        if (!cancelled) setPropertyDetail(null)
      } finally {
        if (!cancelled) setPropertyLoading(false)
      }
    }
    loadProp()
    return () => {
      cancelled = true
    }
  }, [primaryApplication?.propertyId])

  function mergeApplicationRow(updated) {
    if (!updated?.id) return
    setMyApplications((prev) =>
      prev.map((row) => {
        if (Number(row.id) !== Number(updated.id)) return row
        const merged = { ...row, ...updated }
        if (updated.depositPaid !== undefined) merged.depositPaid = updated.depositPaid
        else merged.depositPaid = true
        return merged
      }),
    )
  }

  async function resetDepositForTesting(app) {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !app?.id) return
    setDepositResetSavingId(app.id)
    try {
      const res = await fetch(`/api/v1/applications/${app.id}/deposit/reset-for-testing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not clear deposit (${res.status})`)
      if (data.item) mergeApplicationRow(data.item)
      pushToast({ message: 'Deposit cleared for testing — you can use Pay deposit again.', type: 'success' })
    } catch (e) {
      pushToast({ message: e.message || 'Clear deposit failed.', type: 'error' })
    } finally {
      setDepositResetSavingId(null)
    }
  }

  const yearOptions = useMemo(() => {
    if (!leaseRange) return []
    const { minY, maxY } = leaseRange
    const n = Math.max(1, maxY - minY + 1)
    return Array.from({ length: n }, (_, i) => minY + i)
  }, [leaseRange])

  const recordByMonth = useMemo(() => {
    const map = new Map()
    for (const r of rentMonthRecords) {
      const mo = Number(r.month)
      if (Number.isFinite(mo)) map.set(mo, r)
    }
    return map
  }, [rentMonthRecords])

  const monthCells = useMemo(() => {
    return MONTH_SHORT.map((label, m) => {
      const monthNum = m + 1
      const inLease = monthOverlapsLease(payYear, monthNum, leaseRange)
      const rec = recordByMonth.get(monthNum)
      const unavailable = rec?.monthState === 'unavailable'
      const paid = paidMonths.includes(monthNum) && !unavailable
      const studentLogged = studentLoggedMonths.includes(monthNum) && !paid && !unavailable
      return {
        label,
        m: monthNum,
        key: `${payYear}-${m}`,
        paid,
        unavailable,
        studentLogged,
        outsideLease: leaseRange ? !inLease : true,
      }
    })
  }, [payYear, paidMonths, studentLoggedMonths, leaseRange, recordByMonth])

  const rentCalendarTenancyLine = useMemo(() => {
    if (!leaseRange) return null
    return `Tenancy: ${formatDateShort(leaseRange.moveIn)} → ${formatDateShort(leaseRange.moveOut)}. Months outside this range are not part of your lease on MySewa.`
  }, [leaseRange])

  function onRentMonthClick(m) {
    if (!leaseRange) {
      pushToast({
        message: 'Rent calendar is still loading, or move-in / lease-end dates are missing from your application.',
        type: 'info',
      })
      return
    }
    if (!monthOverlapsLease(payYear, m, leaseRange)) {
      pushToast({ message: 'That month is outside your tenancy (move-in through lease end).', type: 'info' })
      return
    }
    const rec = recordByMonth.get(m)
    const unavailable = rec?.monthState === 'unavailable'
    const paid = paidMonths.includes(m) && !unavailable
    if (paid) {
      pushToast({
        message: `Your landlord has marked ${MONTH_SHORT[m - 1]} ${payYear} as paid.`,
        type: 'success',
      })
      return
    }
    if (unavailable) {
      pushToast({
        message: `${MONTH_SHORT[m - 1]} ${payYear} is marked unavailable — no rent is due for that month.`,
        type: 'info',
      })
      return
    }
    setPayRentHintMonth(m)
  }

  async function submitReport(e) {
    e.preventDefault()
    const pid = primaryApplication?.propertyId
    if (!pid || !reportText.trim()) return
    if (reportText.trim().length < 10) {
      pushToast({ message: 'Please write at least 10 characters so your landlord understands the issue.', type: 'error' })
      return
    }
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Sign in to submit a report.', type: 'error' })
      return
    }
    setReportSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('message', reportText.trim())
      if (reportImage) fd.append('image', reportImage)
      const res = await fetch(`/api/v1/properties/${encodeURIComponent(pid)}/tenant-reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not send report (${res.status})`)
      pushToast({
        message: 'Report sent. Your landlord will see it under myProperty → myReports.',
        type: 'success',
      })
      setReportText('')
      setReportImage(null)
      if (reportFileInputRef.current) reportFileInputRef.current.value = ''
      setMyReportsRefresh((n) => n + 1)
    } catch (err) {
      pushToast({ message: err.message || 'Could not submit report.', type: 'error' })
    } finally {
      setReportSubmitting(false)
    }
  }

  async function resolveStudentReport(reportId) {
    const pid = primaryApplication?.propertyId
    const token = localStorage.getItem('mysewa_token')
    if (!pid || !token || !reportId) return
    setResolveSavingId(reportId)
    try {
      const res = await fetch(
        `/api/v1/properties/${encodeURIComponent(pid)}/tenant-reports/${encodeURIComponent(reportId)}/resolve`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not resolve (${res.status})`)
      pushToast({ message: 'Marked as resolved — thanks for confirming the fix.', type: 'success' })
      setMyReportsRefresh((n) => n + 1)
    } catch (e) {
      pushToast({ message: e.message || 'Could not mark resolved.', type: 'error' })
    } finally {
      setResolveSavingId(null)
    }
  }

  const monthlyRentDisplay = useMemo(() => {
    const p = propertyDetail?.price
    if (p == null || Number.isNaN(Number(p))) return null
    return `RM ${Number(p).toFixed(0)} / month`
  }, [propertyDetail?.price])

  return (
    <DashboardShell properties>
      {depositModalApp ? (
        <StudentDepositModal
          application={depositModalApp}
          onClose={() => setDepositModalApp(null)}
          onCompleted={(item) => mergeApplicationRow(item)}
        />
      ) : null}
      {payRentHintMonth != null && primaryApplication ? (
        <StudentRentPaymentHintModal
          applicationId={primaryApplication.id}
          year={payYear}
          month={payRentHintMonth}
          monthLabel={`${MONTH_SHORT[payRentHintMonth - 1]} ${payYear}`}
          monthlyRent={rentCalendarMonthlyRent ?? propertyDetail?.price ?? null}
          existingLog={
            studentRentPaymentLogs.find((l) => Number(l.month) === payRentHintMonth) ?? null
          }
          onClose={() => setPayRentHintMonth(null)}
          onSaved={onRentCalendarSaved}
        />
      ) : null}
      <article className="dashboard-page-intro student-myproperty-page student-my-dashboard">
        <header className="student-myproperty-page-head">
          <h1 className="student-myproperty-page-title">myProperty</h1>
          <p className="student-myproperty-page-lead">Your tenancy, payments, and communication in one place.</p>
        </header>

        {loading ? <div className="auth-toast">Loading your account…</div> : null}
        {!loading && error ? <div className="auth-toast auth-toast-error">Error: {error}</div> : null}

        {!loading && !error && user ? (
          <>
            <section className="student-dash-section student-myproperty-section" aria-labelledby="student-mp-current-heading">
              <h2 id="student-mp-current-heading" className="student-myproperty-section-title">
                1. Current Property
              </h2>
              <p className="student-dash-muted student-myproperty-section-intro">
                Information about the listing tied to your accepted application.
              </p>
              {myApplicationsLoading ? <p className="auth-toast">Loading…</p> : null}
              {!myApplicationsLoading && !primaryApplication ? (
                <div className="student-dash-card student-rental-empty">
                  <p>You don&apos;t have an accepted rental on your account yet.</p>
                  <p className="student-dash-muted">Apply from a property on Home — when a landlord accepts, details appear here.</p>
                  <button type="button" className="signin-submit" onClick={() => navigate('/')}>
                    Browse listings
                  </button>
                </div>
              ) : null}
              {!myApplicationsLoading && primaryApplication ? (
                <div className="student-dash-card student-myproperty-current-card">
                  {propertyLoading ? <p className="student-dash-muted">Loading property details…</p> : null}
                  <h3 className="student-myproperty-prop-name">
                    {propertyDetail?.name || primaryApplication.propertyName || `Property #${primaryApplication.propertyId}`}
                  </h3>
                  <dl className="student-myproperty-dl">
                    <div>
                      <dt>Application</dt>
                      <dd>#{primaryApplication.id}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd className="student-myproperty-dd-cap">{primaryApplication.status || 'accepted'}</dd>
                    </div>
                    <div>
                      <dt>Move In</dt>
                      <dd>{primaryApplication.preferredMoveIn || '—'}</dd>
                    </div>
                    <div>
                      <dt>Move Out</dt>
                      <dd>{primaryApplication.leaseEnd || primaryApplication.leaseEndDate || primaryApplication.lease_end || '—'}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{primaryApplication.updatedAt ? formatApplicationWhen(primaryApplication.updatedAt) : '—'}</dd>
                    </div>
                    {propertyDetail?.location ? (
                      <div className="student-myproperty-dl-wide">
                        <dt>Address</dt>
                        <dd>{propertyDetail.location}</dd>
                      </div>
                    ) : null}
                    {propertyDetail?.type ? (
                      <div>
                        <dt>Type</dt>
                        <dd>{propertyDetail.type}</dd>
                      </div>
                    ) : null}
                    {monthlyRentDisplay ? (
                      <div>
                        <dt>Monthly rent</dt>
                        <dd>{monthlyRentDisplay}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}
            </section>

            <section
              className="student-dash-section student-myproperty-section"
              id="student-myproperty-payment"
              aria-labelledby="student-mp-pay-heading"
            >
              <h2 id="student-mp-pay-heading" className="student-myproperty-section-title">
                2. Payment
              </h2>

              <div className="student-myproperty-subsection">
                <h3 className="student-myproperty-subtitle">Deposit</h3>
                <p className="student-dash-muted">
                  After acceptance, the landlord&apos;s deposit amount appears here for you to pay — it is{' '}
                  <strong>not transferred as cash automatically</strong>. Use Pay deposit for manual bank / QR / cash,
                  ToyyibPay, or the instant demo.
                </p>
                {!primaryApplication ? (
                  <div className="student-dash-card student-rental-empty student-myproperty-nested-card">
                    <p>No accepted application — deposit payment is not available yet.</p>
                  </div>
                ) : (
                  <div className="student-dash-card student-myproperty-nested-card">
                    <p className="student-myproperty-deposit-amount">
                      <strong>
                        {formatRmMyr(resolvedStudentDepositAmount(primaryApplication))}
                      </strong>
                      <span className="student-dash-muted student-myproperty-deposit-note">
                        {isLandlordDepositConfigured(primaryApplication)
                          ? ' Amount set by your landlord when they accepted.'
                          : ' Estimate until your landlord records the deposit on their side.'}
                      </span>
                    </p>
                    <div className="student-myproperty-deposit-actions">
                      {!primaryApplication.depositPaid ? (
                        <button type="button" className="signin-submit" onClick={() => setDepositModalApp(primaryApplication)}>
                          Pay deposit
                        </button>
                      ) : (
                        <>
                          <span className="student-app-deposit-paid">Deposit recorded</span>
                          {depositResetAllowed ? (
                            <button
                              type="button"
                              className="landlord-application-status-btn landlord-application-status-btn--ghost"
                              disabled={depositResetSavingId === primaryApplication.id}
                              onClick={() => resetDepositForTesting(primaryApplication)}
                            >
                              {depositResetSavingId === primaryApplication.id ? 'Clearing…' : 'Clear deposit (test)'}
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="student-myproperty-subsection">
                <h3 className="student-myproperty-subtitle">Monthly rent calendar</h3>
                <p className="student-dash-muted">
                  This calendar stays <strong>in sync with your landlord</strong>: paid and unavailable months come from
                  their rent tracker. You <strong>pay</strong> off-app; use{' '}
                  <strong>I&apos;ve sent this month&apos;s rent</strong> in the month dialog to log your payment for
                  your own records until your landlord marks paid.
                </p>
                {!primaryApplication ? (
                  <div className="student-dash-card student-rental-empty student-myproperty-nested-card">
                    <p>No accepted application — the monthly rent calendar is not available yet.</p>
                  </div>
                ) : rentCalendarLoading && !leaseRange ? (
                  <p className="student-dash-muted">Loading rent calendar…</p>
                ) : (
                  <>
                    {rentCalendarTenancyLine ? (
                      <p className="student-dash-muted landlord-rent-tracker-rentline">{rentCalendarTenancyLine}</p>
                    ) : (
                      <p className="student-dash-muted landlord-rent-tracker-rentline">
                        Move-in or lease-end on your application could not be read as dates — the grid may not match
                        your tenancy until those fields are valid (YYYY-MM-DD).
                      </p>
                    )}
                    {yearOptions.length > 0 ? (
                      <div className="student-myproperty-pay-toolbar">
                        <label className="student-myproperty-year-label" htmlFor="student-mp-pay-year">
                          Year
                        </label>
                        <select
                          id="student-mp-pay-year"
                          className="student-myproperty-year-select"
                          value={payYear}
                          onChange={(e) => setPayYear(Number(e.target.value))}
                          disabled={rentCalendarLoading}
                        >
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="student-dash-muted landlord-rent-tracker-rentline">
                        No calendar years available — check move-in and lease-end on your accepted application.
                      </p>
                    )}
                    <div className="student-myproperty-month-grid" role="list">
                      {monthCells.map((cell) => (
                        <button
                          key={cell.key}
                          type="button"
                          role="listitem"
                          disabled={cell.outsideLease || rentCalendarLoading || payRentHintMonth != null}
                          className={[
                            'student-myproperty-month-btn',
                            cell.outsideLease
                              ? 'student-myproperty-month-btn--future'
                              : cell.paid
                                ? 'student-myproperty-month-btn--paid'
                                : cell.unavailable
                                  ? 'student-myproperty-month-btn--unavailable'
                                  : cell.studentLogged
                                    ? 'student-myproperty-month-btn--logged'
                                    : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => onRentMonthClick(cell.m)}
                          title={
                            cell.outsideLease
                              ? 'Outside tenancy (move-in — lease end)'
                              : cell.paid
                                ? 'Paid — confirmed by your landlord'
                                : cell.unavailable
                                  ? 'No rent due this month (landlord)'
                                  : cell.studentLogged
                                    ? 'You logged payment — tap to update or remove'
                                    : 'Tap for payment guidance and to log payment'
                          }
                        >
                          <span className="student-myproperty-month-label">{cell.label}</span>
                          <span className="student-myproperty-month-status">
                            {cell.paid
                              ? 'Paid'
                              : cell.outsideLease
                                ? '—'
                                : cell.unavailable
                                  ? 'N/A'
                                  : cell.studentLogged
                                    ? 'Logged'
                                    : 'Pay'}
                          </span>
                        </button>
                      ))}
                    </div>
                    <ul className="student-myproperty-legend">
                      <li>
                        <span className="student-myproperty-legend-swatch student-myproperty-month-btn--paid" /> Paid
                      </li>
                      <li>
                        <span className="student-myproperty-legend-swatch student-myproperty-month-btn--unavailable" />{' '}
                        Unavailable
                      </li>
                      <li>
                        <span className="student-myproperty-legend-swatch student-myproperty-month-btn--future" /> Outside
                        tenancy
                      </li>
                      <li>
                        <span className="student-myproperty-legend-swatch student-myproperty-month-btn--logged" /> Logged
                        (you)
                      </li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            <section className="student-dash-section student-myproperty-section" aria-labelledby="student-mp-comm-heading">
              <h2 id="student-mp-comm-heading" className="student-myproperty-section-title">
                3. Communication
              </h2>

              <div className="student-myproperty-subsection">
                <h3 className="student-myproperty-subtitle">Reviews &amp; ratings</h3>
                <p className="student-dash-muted">Share feedback for a listing where you have an accepted application.</p>
                {!primaryApplication ? (
                  <div className="student-dash-card student-rental-empty student-myproperty-nested-card">
                    <p>Reviews unlock after a landlord accepts your application.</p>
                  </div>
                ) : (
                  <div className="student-dash-card student-myproperty-nested-card">
                    <PropertyReviewsSection propertyId={primaryApplication.propertyId} hideSectionTitle />
                  </div>
                )}
              </div>

              <div className="student-myproperty-subsection">
                <h3 className="student-myproperty-subtitle">Reports</h3>
                <p className="student-dash-muted">
                  Report maintenance or tenancy issues. Your landlord sees them under <strong>myReports</strong> on My
                  properties. After they tap <strong>Receive</strong>, you can tap <strong>Resolve</strong> here when the
                  problem is fixed.
                </p>
                {!primaryApplication ? (
                  <div className="student-dash-card student-rental-empty student-myproperty-nested-card">
                    <p>Reports are available after a landlord accepts your application.</p>
                  </div>
                ) : (
                  <>
                    <div className="student-myproperty-reports">
                      <h4 className="student-myproperty-reports-title">Your reports</h4>
                      {myReportsLoading ? (
                        <p className="student-dash-muted">Loading your reports…</p>
                      ) : myReports.length === 0 ? (
                        <p className="student-dash-muted">No reports submitted yet for this listing.</p>
                      ) : (
                        <ul className="student-myproperty-reports-list">
                          {myReports.map((rep) => {
                            const st = String(rep.status || 'pending').toLowerCase()
                            const canResolve = st === 'received'
                            const busy = resolveSavingId === rep.id
                            return (
                              <li key={rep.id} className="student-myproperty-report-card">
                                <div className="student-myproperty-report-top">
                                  <p className="student-myproperty-report-meta">
                                    {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ''}
                                  </p>
                                  <span className={studentReportStatusBadgeClass(rep.status)}>
                                    {studentReportStatusLabel(rep.status)}
                                  </span>
                                </div>
                                <p className="student-myproperty-report-body">{rep.message}</p>
                                {rep.imageUrl ? (
                                  <a href={studentReportImageUrl(rep.imageUrl)} target="_blank" rel="noreferrer">
                                    <img
                                      src={studentReportImageUrl(rep.imageUrl)}
                                      alt=""
                                      className="student-myproperty-report-img"
                                    />
                                  </a>
                                ) : null}
                                {canResolve ? (
                                  <div className="student-myproperty-report-resolve">
                                    <button
                                      type="button"
                                      className="signin-submit"
                                      disabled={busy}
                                      onClick={() => resolveStudentReport(rep.id)}
                                    >
                                      {busy ? 'Saving…' : 'Resolve'}
                                    </button>
                                    <p className="student-dash-muted student-myproperty-report-file-hint">
                                      Use when the repair (or agreed action) is done.
                                    </p>
                                  </div>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                    <form className="student-dash-form" onSubmit={submitReport}>
                      <label className="student-dash-label" htmlFor="student-mp-report-msg">
                        Describe the issue
                      </label>
                      <textarea
                        id="student-mp-report-msg"
                        className="student-dash-textarea"
                        rows={4}
                        placeholder="e.g. Aircon not cooling, leak under sink…"
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        disabled={reportSubmitting}
                        maxLength={4000}
                      />
                      <label className="student-dash-label" htmlFor="student-mp-report-img">
                        Photo (optional)
                      </label>
                      <input
                        id="student-mp-report-img"
                        ref={reportFileInputRef}
                        type="file"
                        accept="image/*"
                        className="student-myproperty-report-file"
                        disabled={reportSubmitting}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          setReportImage(f && f.size > 0 ? f : null)
                        }}
                      />
                      <p className="student-dash-muted student-myproperty-report-file-hint">
                        JPG or PNG, max 8 MB. Sent only to your landlord for this property.
                      </p>
                      <button
                        type="submit"
                        className="signin-submit"
                        disabled={reportSubmitting || reportText.trim().length < 10}
                      >
                        {reportSubmitting ? 'Sending…' : 'Submit report'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </section>

            <div className="student-myproperty-footer-slot">
              <StudentAccountSiteFooter />
            </div>
          </>
        ) : null}
      </article>
    </DashboardShell>
  )
}
