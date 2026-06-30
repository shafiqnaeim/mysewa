import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import LandlordLayout from '../components/LandlordLayout'
import StudentLayout from '../components/StudentLayout'
import LandlordRentMonthModal from '../components/LandlordRentMonthModal'
import StudentRentPaymentHintModal from '../components/StudentRentPaymentHintModal'
import MarkRentPaidConfirmModal from '../components/rent-tracker/MarkRentPaidConfirmModal'
import MarkRentUnavailableConfirmModal from '../components/rent-tracker/MarkRentUnavailableConfirmModal'
import RentTrackerMonthDetails from '../components/rent-tracker/RentTrackerMonthDetails'
import ReceiptModal from '../components/ReceiptModal'
import EndTenancyConfirmModal from '../components/landlord/EndTenancyConfirmModal'
import { useToast } from '../context/ToastContext'
import { dashboardPathForRole, normalizeRole } from '../auth/dashboardPaths'
import { formatPropertyLocationLine } from '../utils/propertyDisplay'
import {
  buildMonthCell,
  computeRentTotals,
  formatRm,
  MONTH_FULL,
  MONTH_SHORT,
  parseLeaseRange,
  tenancyPeriodLabel,
} from '../utils/rentTrackerUtils'
import { fetchBookingCalendar, endTenancy } from '../services/bookingService'
import { fetchRentPaymentLogs } from '../services/rentPaymentService'
import { buildRentReceiptData } from '../utils/ReceiptGenerator'
import { canShowEndTenancy } from '../utils/bookingLifecycle'

function useRentTrackerAccess(expectedRole) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      navigate('/signin')
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Failed to load profile (${res.status})`)
        const u = data.user
        const role = normalizeRole(u?.role)
        if (role !== normalizeRole(expectedRole)) {
          navigate(dashboardPathForRole(role), { replace: true })
          return
        }
        if (!cancelled) setUser(u)
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Your session has expired.')
          localStorage.removeItem('mysewa_token')
          navigate('/signin')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [expectedRole, navigate])

  return { user, loading, error }
}

function applyYearPayload(setters, data) {
  const { setPaidMonths, setRentMonthRecords, setStudentRentPaymentLogs } = setters
  if (Array.isArray(data.paidMonths)) setPaidMonths(data.paidMonths.map((n) => Number(n)))
  if (Array.isArray(data.rentMonthRecords)) setRentMonthRecords(data.rentMonthRecords)
  if (Array.isArray(data.studentRentPaymentLogs)) setStudentRentPaymentLogs(data.studentRentPaymentLogs)
}

function mergeBookingCalendarMonths(existingRecords, calendarMonths, year) {
  const byMonth = new Map()
  for (const rec of existingRecords) {
    const mo = Number(rec.month)
    if (Number.isFinite(mo)) byMonth.set(mo, rec)
  }
  if (!Array.isArray(calendarMonths)) return [...byMonth.values()]
  for (const row of calendarMonths) {
    if (Number(row.year) !== year) continue
    const mo = Number(row.month)
    if (!Number.isFinite(mo)) continue
    const status = String(row.status || 'pending').toLowerCase()
    const monthState =
      status === 'paid' || status === 'received'
        ? 'received'
        : status === 'unavailable'
          ? 'unavailable'
          : 'pending'
    const existing = byMonth.get(mo)
    byMonth.set(mo, {
      month: mo,
      amount: row.amount != null ? row.amount : existing?.amount,
      monthState: existing?.monthState || monthState,
      channel: existing?.channel,
      recordedAt: existing?.recordedAt,
    })
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month)
}

const MONTH_STATUS_CLASS = {
  paid: 'border-green-500 bg-green-50 text-green-800 hover:bg-green-100',
  pending: 'border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100',
  pending_confirmation: 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100',
  overdue: 'border-red-500 bg-red-50 text-red-800 hover:bg-red-100',
  unavailable: 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200',
  outside: 'border-[#E2E8F0] bg-gray-50 text-gray-400 cursor-not-allowed',
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
        <span aria-hidden="true">{icon} </span>
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-[#2D3748]">{value}</p>
    </div>
  )
}

function RentTrackerContent({ role }) {
  const { applicationId, bookingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const { user, loading: authLoading, error: authError } = useRentTrackerAccess(role)

  const appId =
    applicationId != null ? Number(applicationId) : bookingId != null ? Number(bookingId) : Number.NaN
  const isLandlord = role === 'landlord'

  const backTo = useMemo(() => {
    if (location.pathname.startsWith('/my-properties')) return '/my-properties'
    if (isLandlord) return '/dashboard/landlord/applications'
    return '/dashboard/student/bookings'
  }, [location.pathname, isLandlord])

  const today = useMemo(() => new Date(), [])
  const [payYear, setPayYear] = useState(() => today.getFullYear())
  const [meta, setMeta] = useState(null)
  const [property, setProperty] = useState(null)
  const [leaseRange, setLeaseRange] = useState(null)
  const [paidMonths, setPaidMonths] = useState([])
  const [rentMonthRecords, setRentMonthRecords] = useState([])
  const [studentRentPaymentLogs, setStudentRentPaymentLogs] = useState([])
  const [allYearPayloads, setAllYearPayloads] = useState({})
  const [pageLoading, setPageLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [landlordModalOpen, setLandlordModalOpen] = useState(false)
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false)
  const [confirmUnavailableOpen, setConfirmUnavailableOpen] = useState(false)
  const [markPaidSaving, setMarkPaidSaving] = useState(false)
  const [markUnavailableSaving, setMarkUnavailableSaving] = useState(false)
  const [studentPayModalOpen, setStudentPayModalOpen] = useState(false)
  const [bookingCalendarMonths, setBookingCalendarMonths] = useState([])
  const [paymentLogs, setPaymentLogs] = useState([])
  const [receiptModalData, setReceiptModalData] = useState(null)
  const [endTenancyOpen, setEndTenancyOpen] = useState(false)
  const [endingTenancy, setEndingTenancy] = useState(false)
  const leaseYearClampKeyRef = useRef('')

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mysewa_token') : ''

  const loadYear = useCallback(
    async (year) => {
      if (!token || !Number.isFinite(appId)) return null
      const res = await fetch(`/api/v1/applications/${encodeURIComponent(appId)}/rent-months?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not load calendar (${res.status})`)
      return data
    },
    [appId, token],
  )

  const refreshYear = useCallback(
    async (year, { silent = false } = {}) => {
      if (!silent) setPageLoading(true)
      try {
        const data = await loadYear(year)
        if (!data) return
        setMeta((prev) => ({
          propertyName: data.propertyName,
          studentName: data.studentName,
          monthlyRent: data.monthlyRent,
          propertyId: data.propertyId,
          preferredMoveIn: data.preferredMoveIn ?? null,
          leaseEnd: data.leaseEnd ?? data.leaseEndDate ?? null,
          applicationStatus: data.applicationStatus ?? prev?.applicationStatus ?? 'accepted',
        }))
        const range = parseLeaseRange(data.preferredMoveIn, data.leaseEnd ?? data.leaseEndDate)
        setLeaseRange(range)
        applyYearPayload(
          { setPaidMonths, setRentMonthRecords, setStudentRentPaymentLogs },
          data,
        )
        setAllYearPayloads((prev) => ({ ...prev, [year]: data }))
        if (data.propertyId && !property) {
          const propRes = await fetch(`/api/v1/properties/${encodeURIComponent(data.propertyId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const propData = await propRes.json().catch(() => ({}))
          if (propRes.ok) setProperty(propData.item || propData)
        }
      } catch (e) {
        pushToast({ message: e.message || 'Failed to load rent tracker.', type: 'error' })
      } finally {
        if (!silent) setPageLoading(false)
      }
    },
    [loadYear, property, pushToast, token],
  )

  useEffect(() => {
    if (!Number.isFinite(appId)) {
      setPageLoading(false)
      return
    }
    refreshYear(payYear)
  }, [appId, payYear, refreshYear])

  useEffect(() => {
    if (!token || !Number.isFinite(appId)) return
    let cancelled = false
    fetchBookingCalendar(appId, token)
      .then((data) => {
        if (!cancelled && Array.isArray(data?.months)) {
          setBookingCalendarMonths(data.months)
          if (data.propertyId && !property) {
            fetch(`/api/v1/properties/${encodeURIComponent(data.propertyId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((res) => res.json().catch(() => ({})))
              .then((propData) => {
                if (!cancelled && propData?.item) setProperty(propData.item)
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {
        if (!cancelled) setBookingCalendarMonths([])
      })
    return () => {
      cancelled = true
    }
  }, [appId, token, property])

  useEffect(() => {
    if (!leaseRange || !Number.isFinite(appId) || !token) return
    const { minY, maxY } = leaseRange
    const years = []
    for (let y = minY; y <= maxY; y += 1) years.push(y)

    let cancelled = false
    async function loadAllYears() {
      try {
        const entries = await Promise.all(
          years.map(async (y) => {
            if (y === payYear && allYearPayloads[y]) return [y, allYearPayloads[y]]
            const data = await loadYear(y)
            return [y, data]
          }),
        )
        if (!cancelled) {
          setAllYearPayloads((prev) => ({
            ...prev,
            ...Object.fromEntries(entries.filter(([, d]) => d)),
          }))
        }
      } catch {
        /* totals may be partial */
      }
    }
    loadAllYears()
    return () => {
      cancelled = true
    }
  }, [leaseRange, appId, token, loadYear, payYear])

  useEffect(() => {
    if (!leaseRange || !Number.isFinite(appId)) return
    const key = `${appId}-${leaseRange.minY}-${leaseRange.maxY}`
    if (leaseYearClampKeyRef.current === key) return
    leaseYearClampKeyRef.current = key
    setPayYear((y) => Math.min(leaseRange.maxY, Math.max(leaseRange.minY, y)))
  }, [leaseRange, appId])

  useEffect(() => {
    if (!token || !Number.isFinite(appId)) return
    let cancelled = false
    fetchRentPaymentLogs(appId, token)
      .then((items) => {
        if (!cancelled) setPaymentLogs(items)
      })
      .catch(() => {
        if (!cancelled) setPaymentLogs([])
      })
    return () => {
      cancelled = true
    }
  }, [appId, token, studentRentPaymentLogs, paidMonths])

  const studentLoggedMonths = useMemo(
    () => studentRentPaymentLogs.map((l) => Number(l.month)).filter((n) => Number.isFinite(n)),
    [studentRentPaymentLogs],
  )

  const yearOptions = useMemo(() => {
    if (!leaseRange) return []
    const { minY, maxY } = leaseRange
    return Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i)
  }, [leaseRange])

  const recordByMonth = useMemo(() => {
    const merged = mergeBookingCalendarMonths(rentMonthRecords, bookingCalendarMonths, payYear)
    const map = new Map()
    for (const r of merged) {
      const mo = Number(r.month)
      if (Number.isFinite(mo)) map.set(mo, r)
    }
    return map
  }, [rentMonthRecords, bookingCalendarMonths, payYear])

  const recordsByYearMonth = useMemo(() => {
    const map = new Map()
    for (const [yearStr, payload] of Object.entries(allYearPayloads)) {
      const y = Number(yearStr)
      const records = Array.isArray(payload?.rentMonthRecords) ? payload.rentMonthRecords : []
      for (const rec of records) {
        map.set(`${y}-${rec.month}`, rec)
      }
    }
    return map
  }, [allYearPayloads])

  const { totalPaid, totalPending } = useMemo(
    () =>
      computeRentTotals({
        leaseRange,
        monthlyRent: meta?.monthlyRent,
        recordsByYearMonth,
      }),
    [leaseRange, meta?.monthlyRent, recordsByYearMonth],
  )

  const monthCells = useMemo(() => {
    return MONTH_SHORT.map((_, idx) => {
      const month = idx + 1
      const paid = paidMonths.includes(month)
      const studentLogged = studentLoggedMonths.includes(month) && !paid
      return buildMonthCell({
        year: payYear,
        month,
        leaseRange,
        paidMonths,
        recordByMonth,
        studentLogged,
      })
    })
  }, [payYear, leaseRange, paidMonths, recordByMonth, studentLoggedMonths])

  const selectedCell = selectedMonth != null ? monthCells.find((c) => c.month === selectedMonth) : null
  const selectedStudentLog =
    selectedMonth != null
      ? studentRentPaymentLogs.find((l) => Number(l.month) === selectedMonth) ?? null
      : null

  const address = property
    ? formatPropertyLocationLine(property) !== 'Location not set'
      ? formatPropertyLocationLine(property)
      : property.location || property.city || '—'
    : '—'

  const monthlyRentLabel =
    meta?.monthlyRent != null && Number.isFinite(Number(meta.monthlyRent))
      ? formatRm(meta.monthlyRent)
      : '—'

  function onMonthClick(month) {
    const cell = monthCells.find((c) => c.month === month)
    if (!cell?.inLease) {
      pushToast({ message: 'That month is outside your tenancy period.', type: 'info' })
      return
    }
    setSelectedMonth(month)
  }

  function handleYearSaved(data) {
    applyYearPayload({ setPaidMonths, setRentMonthRecords, setStudentRentPaymentLogs }, data)
    setAllYearPayloads((prev) => ({ ...prev, [payYear]: { ...prev[payYear], ...data } }))
    setLandlordModalOpen(false)
    setStudentPayModalOpen(false)
    refreshYear(payYear, { silent: true })
    if (Number.isFinite(appId)) {
      fetchRentPaymentLogs(appId, token)
        .then(setPaymentLogs)
        .catch(() => {})
    }
  }

  function handleStudentSaved(data) {
    applyYearPayload({ setPaidMonths, setRentMonthRecords, setStudentRentPaymentLogs }, data)
    setStudentPayModalOpen(false)
    refreshYear(payYear, { silent: true })
  }

  const modalExisting = selectedMonth != null ? recordByMonth.get(selectedMonth) : null
  const modalMonthLabel = selectedMonth != null ? `${MONTH_SHORT[selectedMonth - 1]} ${payYear}` : ''
  const confirmMonthLabel =
    selectedMonth != null ? `${MONTH_FULL[selectedMonth - 1]} ${payYear}` : ''
  const propertyDisplayName =
    meta?.propertyName?.trim() || (meta?.propertyId ? `Property #${meta.propertyId}` : '')

  const endTenancyBooking = useMemo(() => {
    if (!isLandlord || !Number.isFinite(appId) || !meta) return null
    const booking = {
      id: appId,
      status: meta.applicationStatus || 'accepted',
      preferredMoveIn: meta.preferredMoveIn,
      leaseEnd: meta.leaseEnd,
      depositPaid: true,
      studentName: meta.studentName,
      propertyName: meta.propertyName,
    }
    return canShowEndTenancy(booking) ? booking : null
  }, [isLandlord, appId, meta])

  function handleViewReceipt() {
    if (!selectedCell?.paid || selectedMonth == null) return
    const record = recordByMonth.get(selectedMonth)
    const amount =
      record?.amount != null && Number.isFinite(Number(record.amount))
        ? Number(record.amount)
        : meta?.monthlyRent
    setReceiptModalData(
      buildRentReceiptData({
        bookingId: appId,
        year: payYear,
        month: selectedMonth,
        amount,
        paymentMethod: selectedStudentLog?.paymentMethod || record?.channel,
        paymentLogId: selectedStudentLog?.paymentLogId,
        studentName: isLandlord ? meta?.studentName : user?.fullName,
        propertyName: propertyDisplayName,
        propertyAddress: address !== '—' ? address : '',
        landlordName: isLandlord ? user?.fullName : property?.landlordName,
        recordedAt: record?.recordedAt,
        loggedAt: selectedStudentLog?.loggedAt,
      }),
    )
  }

  const hasListingRent =
    meta?.monthlyRent != null && Number.isFinite(Number(meta.monthlyRent)) && Number(meta.monthlyRent) > 0

  const confirmPaidAmount = useMemo(() => {
    if (selectedCell?.amount != null && Number.isFinite(selectedCell.amount)) return selectedCell.amount
    if (hasListingRent) return Number(meta.monthlyRent)
    return null
  }, [selectedCell, hasListingRent, meta?.monthlyRent])

  function handleLandlordManage(action) {
    if (action === 'paid') {
      if (hasListingRent) setConfirmPaidOpen(true)
      else setLandlordModalOpen(true)
      return
    }
    if (action === 'unavailable') {
      setConfirmUnavailableOpen(true)
      return
    }
    setLandlordModalOpen(true)
  }

  async function confirmMarkPaid() {
    if (!token || !Number.isFinite(appId) || selectedMonth == null) return
    setMarkPaidSaving(true)
    try {
      const body = hasListingRent
        ? { year: payYear, month: selectedMonth }
        : { year: payYear, month: selectedMonth, amount: confirmPaidAmount }
      const res = await fetch(`/api/v1/applications/${encodeURIComponent(appId)}/rent-months/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not save (${res.status})`)
      pushToast({ message: `${confirmMonthLabel} marked as paid.`, type: 'success' })
      setConfirmPaidOpen(false)
      handleYearSaved(data)
    } catch (e) {
      pushToast({ message: e.message || 'Failed to mark as paid.', type: 'error' })
    } finally {
      setMarkPaidSaving(false)
    }
  }

  async function confirmMarkUnavailable() {
    if (!token || !Number.isFinite(appId) || selectedMonth == null) return
    setMarkUnavailableSaving(true)
    try {
      const res = await fetch(
        `/api/v1/applications/${encodeURIComponent(appId)}/rent-months/mark-unavailable`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ year: payYear, month: selectedMonth }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not save (${res.status})`)
      pushToast({
        message: `${confirmMonthLabel} marked as unavailable (no rent expected).`,
        type: 'success',
      })
      setConfirmUnavailableOpen(false)
      handleYearSaved(data)
    } catch (e) {
      pushToast({ message: e.message || 'Failed to mark as unavailable.', type: 'error' })
    } finally {
      setMarkUnavailableSaving(false)
    }
  }

  async function confirmEndTenancy() {
    if (!endTenancyBooking?.id) return
    setEndingTenancy(true)
    try {
      const data = await endTenancy(endTenancyBooking.id, token)
      pushToast({ message: '✅ Tenancy ended successfully.', type: 'success' })
      setEndTenancyOpen(false)
      if (data?.booking?.status) {
        setMeta((prev) => ({
          ...prev,
          applicationStatus: data.booking.status,
        }))
      }
      if (data?.booking?.propertyId) {
        const propRes = await fetch(`/api/v1/properties/${encodeURIComponent(data.booking.propertyId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const propData = await propRes.json().catch(() => ({}))
        if (propRes.ok) setProperty(propData.item || propData)
      }
    } catch (e) {
      pushToast({ message: e.message || 'Unable to end tenancy.', type: 'error' })
    } finally {
      setEndingTenancy(false)
    }
  }

  if (authLoading || (pageLoading && !meta)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[#A0AEC0]">Loading rent tracker…</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{authError}</div>
      </div>
    )
  }

  if (!Number.isFinite(appId)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-[#A0AEC0]">Invalid booking link.</p>
      </div>
    )
  }

  const body = (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#2D3748]">
                <span aria-hidden="true">📅 </span>
                Monthly Rent Tracker
              </h1>
              <p className="mt-2 text-sm text-[#A0AEC0]">
                Track and manage rent payments for your tenancy
              </p>
              <div className="mt-4">
                <p className="text-lg font-semibold text-[#2D3748]">
                  {meta?.propertyName || `Property #${meta?.propertyId || '—'}`}
                </p>
                <p className="text-sm text-[#A0AEC0]">{address}</p>
                {meta?.studentName && isLandlord ? (
                  <p className="mt-1 text-sm text-[#4A5568]">Tenant: {meta.studentName}</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {isLandlord && endTenancyBooking ? (
                <button
                  type="button"
                  onClick={() => setEndTenancyOpen(true)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  <span aria-hidden="true">📤 </span>
                  End Tenancy
                </button>
              ) : null}
              <Link
                to={backTo}
                className="shrink-0 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#F7FAFC]"
              >
                ← Back
              </Link>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Monthly Rent" value={monthlyRentLabel} icon="💰" />
          <SummaryCard label="Tenancy Period" value={tenancyPeriodLabel(leaseRange)} icon="📅" />
          <SummaryCard label="Total Paid" value={formatRm(totalPaid)} icon="✅" />
          <SummaryCard label="Total Pending" value={formatRm(totalPending)} icon="⏳" />
        </section>

        {isLandlord && paymentLogs.length > 0 ? (
          <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2D3748]">Student payment logs</h2>
            <p className="mt-1 text-sm text-[#718096]">
              Review receipts and confirm when rent is received.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs uppercase tracking-wide text-[#A0AEC0]">
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLogs
                    .filter((log) => Number(log.year) === payYear)
                    .map((log) => (
                      <tr key={`${log.year}-${log.month}-${log.paymentLogId}`} className="border-b border-[#F7FAFC]">
                        <td className="px-3 py-3 font-medium text-[#2D3748]">
                          {MONTH_FULL[Number(log.month) - 1]} {log.year}
                        </td>
                        <td className="px-3 py-3 text-[#4A5568]">{log.studentName || meta?.studentName || '—'}</td>
                        <td className="px-3 py-3 text-[#2D3748]">{formatRm(log.amount)}</td>
                        <td className="px-3 py-3 capitalize text-[#4A5568]">
                          {String(log.paymentMethod || '').replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              log.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {log.status === 'paid' ? 'Paid' : 'Pending Confirmation'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {log.status === 'paid' ? (
                            <span className="text-xs text-[#A0AEC0]">Confirmed</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMonth(Number(log.month))
                                setLandlordModalOpen(true)
                              }}
                              className="rounded-lg bg-[#E88D5B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d97a48]"
                            >
                              Confirm Payment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-[#2D3748]">Calendar</h2>
            {yearOptions.length > 0 ? (
              <div className="flex items-center gap-2">
                <label htmlFor="rent-tracker-year" className="text-sm font-medium text-[#A0AEC0]">
                  Year
                </label>
                <select
                  id="rent-tracker-year"
                  value={payYear}
                  onChange={(e) => {
                    setSelectedMonth(null)
                    setPayYear(Number(e.target.value))
                  }}
                  className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#2D3748]"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {monthCells.map((cell) => {
              const selected = selectedMonth === cell.month
              const statusClass = MONTH_STATUS_CLASS[cell.status] || MONTH_STATUS_CLASS.outside
              return (
                <button
                  key={cell.month}
                  type="button"
                  disabled={!cell.inLease}
                  onClick={() => onMonthClick(cell.month)}
                  className={`flex flex-col items-center rounded-xl border-2 px-3 py-4 text-center transition ${statusClass} ${
                    selected ? 'ring-2 ring-[#E88D5B] ring-offset-2' : ''
                  }`}
                >
                  <span className="text-sm font-bold">{cell.label}</span>
                  <span className="mt-1 text-xs font-medium capitalize">
                    {cell.status === 'outside'
                      ? '—'
                      : cell.status === 'unavailable'
                        ? 'N/A'
                        : cell.status === 'pending_confirmation'
                          ? 'Pending confirm'
                          : cell.status}
                  </span>
                </button>
              )
            })}
          </div>

          <ul className="mt-5 flex flex-wrap gap-4 text-xs text-[#4A5568]">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border-2 border-green-500 bg-green-50" />
              Paid
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border-2 border-yellow-400 bg-yellow-50" />
              Pending
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border-2 border-amber-400 bg-amber-50" />
              Pending Confirmation
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border-2 border-red-500 bg-red-50" />
              Overdue
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border-2 border-[#E2E8F0] bg-gray-50" />
              Outside tenancy
            </li>
          </ul>
        </section>

        {selectedCell ? (
          <RentTrackerMonthDetails
            cell={selectedCell}
            year={payYear}
            monthlyRent={meta?.monthlyRent}
            studentPaymentLog={selectedStudentLog}
            role={role}
            onClose={() => setSelectedMonth(null)}
            onLandlordManage={handleLandlordManage}
            onStudentPay={() => setStudentPayModalOpen(true)}
            onContactLandlord={() =>
              navigate(isLandlord ? '/dashboard/landlord/applications' : '/dashboard/student/property')
            }
            onViewReceipt={handleViewReceipt}
          />
        ) : null}
      </div>

      {confirmPaidOpen && selectedMonth != null && isLandlord ? (
        <MarkRentPaidConfirmModal
          monthLabel={confirmMonthLabel}
          propertyName={propertyDisplayName}
          amount={confirmPaidAmount}
          busy={markPaidSaving}
          onConfirm={confirmMarkPaid}
          onCancel={() => setConfirmPaidOpen(false)}
        />
      ) : null}

      {confirmUnavailableOpen && selectedMonth != null && isLandlord ? (
        <MarkRentUnavailableConfirmModal
          monthLabel={confirmMonthLabel}
          propertyName={propertyDisplayName}
          amount={confirmPaidAmount}
          busy={markUnavailableSaving}
          onConfirm={confirmMarkUnavailable}
          onCancel={() => setConfirmUnavailableOpen(false)}
        />
      ) : null}

      {landlordModalOpen && selectedMonth != null && isLandlord ? (
        <LandlordRentMonthModal
          applicationId={appId}
          year={payYear}
          month={selectedMonth}
          monthLabel={modalMonthLabel}
          propertyName={propertyDisplayName}
          studentName={meta?.studentName}
          defaultAmountHint={meta?.monthlyRent}
          existingRecord={
            modalExisting
              ? {
                  amount: modalExisting.amount,
                  channel: modalExisting.channel,
                  monthState: modalExisting.monthState === 'unavailable' ? 'unavailable' : 'received',
                  recordedAt: modalExisting.recordedAt,
                }
              : null
          }
          studentPaymentLog={selectedStudentLog}
          onClose={() => setLandlordModalOpen(false)}
          onSaved={handleYearSaved}
        />
      ) : null}

      {studentPayModalOpen && selectedMonth != null && !isLandlord ? (
        <StudentRentPaymentHintModal
          applicationId={appId}
          year={payYear}
          month={selectedMonth}
          monthLabel={modalMonthLabel}
          monthlyRent={meta?.monthlyRent ?? property?.price}
          propertyName={meta?.propertyName ?? property?.name}
          propertyLocation={formatPropertyLocationLine(property)}
          bankName={property?.bankName}
          bankAccount={property?.accountNumber}
          bankHolder={property?.accountHolder}
          qrImageUrl={property?.qrCodeUrl}
          existingLog={selectedStudentLog}
          studentName={user?.fullName}
          landlordName={property?.landlordName}
          isPaid={paidMonths.includes(selectedMonth)}
          onClose={() => setStudentPayModalOpen(false)}
          onSaved={handleYearSaved}
        />
      ) : null}

      {receiptModalData ? (
        <ReceiptModal receipt={receiptModalData} onClose={() => setReceiptModalData(null)} />
      ) : null}

      {endTenancyOpen && endTenancyBooking && isLandlord ? (
        <EndTenancyConfirmModal
          studentName={endTenancyBooking.studentName}
          propertyName={propertyDisplayName}
          preferredMoveIn={endTenancyBooking.preferredMoveIn}
          leaseEnd={endTenancyBooking.leaseEnd}
          busy={endingTenancy}
          onCancel={() => !endingTenancy && setEndTenancyOpen(false)}
          onConfirm={confirmEndTenancy}
        />
      ) : null}
    </div>
  )

  if (isLandlord) return <LandlordLayout>{body}</LandlordLayout>
  return <StudentLayout>{body}</StudentLayout>
}

export default function MonthlyRentTrackerPage() {
  const location = useLocation()
  const role = location.pathname.includes('/dashboard/student/') ? 'student' : 'landlord'
  return <RentTrackerContent role={role} />
}
