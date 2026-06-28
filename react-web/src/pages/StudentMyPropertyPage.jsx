import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import StudentDepositModal from '../components/StudentDepositModal'
import StudentRentPaymentHintModal from '../components/StudentRentPaymentHintModal'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { formatDateShort, monthOverlapsLease, parseLeaseRange } from '../utils/rentCalendarUtils'
import StudentMyProperty from './dashboard/StudentMyProperty'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function isLandlordDepositConfigured(app) {
  if (!app) return false
  if (app.depositSetByLandlord === true) return true
  const raw = app.landlordDepositAmount ?? app.landlord_deposit_amount
  if (raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) && n > 0
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
    const p = propertyDetail?.price ?? rentCalendarMonthlyRent
    if (p == null || Number.isNaN(Number(p))) return null
    return `RM ${Number(p).toLocaleString('en-MY')}/month`
  }, [propertyDetail?.price, rentCalendarMonthlyRent])

  function handleLogPayment() {
    const next = monthCells.find((cell) => !cell.outsideLease && !cell.paid && !cell.unavailable)
    if (!next) {
      pushToast({ message: 'No pending rent months in your tenancy to log.', type: 'info' })
      return
    }
    onRentMonthClick(next.m)
  }

  async function handleViewReceipt() {
    if (!primaryApplication?.depositPaid) {
      pushToast({ message: 'Deposit has not been paid yet.', type: 'info' })
      return
    }
    const token = localStorage.getItem('mysewa_token')
    if (!token || !primaryApplication?.id) return
    try {
      const res = await fetch(`/api/v1/applications/${primaryApplication.id}/agreement`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Could not load receipt (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 120000)
    } catch (e) {
      pushToast({ message: e.message || 'Receipt could not be opened.', type: 'error' })
    }
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Loading your property…</p>
        </div>
      </StudentLayout>
    )
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {error}
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
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

      <StudentMyProperty
        primaryApplication={primaryApplication}
        propertyDetail={propertyDetail}
        propertyLoading={propertyLoading}
        applicationsLoading={myApplicationsLoading}
        monthlyRentDisplay={monthlyRentDisplay}
        depositConfigured={isLandlordDepositConfigured(primaryApplication)}
        depositResetAllowed={depositResetAllowed}
        depositResetSavingId={depositResetSavingId}
        payYear={payYear}
        yearOptions={yearOptions}
        monthCells={monthCells}
        rentCalendarLoading={rentCalendarLoading}
        rentCalendarTenancyLine={rentCalendarTenancyLine}
        payRentHintMonth={payRentHintMonth}
        myReports={myReports}
        myReportsLoading={myReportsLoading}
        reportText={reportText}
        reportImage={reportImage}
        reportSubmitting={reportSubmitting}
        reportFileInputRef={reportFileInputRef}
        resolveSavingId={resolveSavingId}
        onBrowseListings={() => navigate('/properties')}
        onPayDeposit={() => primaryApplication && setDepositModalApp(primaryApplication)}
        onResetDeposit={() => primaryApplication && resetDepositForTesting(primaryApplication)}
        onViewReceipt={handleViewReceipt}
        onYearChange={setPayYear}
        onMonthClick={onRentMonthClick}
        onLogPayment={handleLogPayment}
        onReportTextChange={setReportText}
        onReportImageChange={(e) => {
          const f = e.target.files?.[0]
          setReportImage(f && f.size > 0 ? f : null)
        }}
        onSubmitReport={submitReport}
        onResolveReport={resolveStudentReport}
      />
    </StudentLayout>
  )
}
