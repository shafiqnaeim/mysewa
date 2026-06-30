import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import StudentDepositModal from '../components/StudentDepositModal'
import StudentRentPaymentHintModal from '../components/StudentRentPaymentHintModal'
import { useStudentGuard } from '../hooks/useStudentGuard'
import { useToast } from '../context/ToastContext'
import { formatDateShort, monthOverlapsLease, parseLeaseRange } from '../utils/rentCalendarUtils'
import { resolvedStudentDepositAmount } from '../utils/studentApplicationDeposit'
import StudentPayments from './dashboard/StudentPayments'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthDueDate(year, month) {
  return new Date(year, month - 1, 1)
}

export default function StudentPaymentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading: authLoading, error: authError } = useStudentGuard()
  const { pushToast } = useToast()

  const today = useMemo(() => new Date(), [])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [depositModalApp, setDepositModalApp] = useState(null)

  const [payYear, setPayYear] = useState(() => today.getFullYear())
  const [paidMonths, setPaidMonths] = useState([])
  const [studentRentPaymentLogs, setStudentRentPaymentLogs] = useState([])
  const [rentMonthRecords, setRentMonthRecords] = useState([])
  const [leaseRange, setLeaseRange] = useState(null)
  const [rentCalendarLoading, setRentCalendarLoading] = useState(false)
  const [rentCalendarMonthlyRent, setRentCalendarMonthlyRent] = useState(null)
  const [payRentHintMonth, setPayRentHintMonth] = useState(null)
  const [allYearRentData, setAllYearRentData] = useState([])
  const leaseClampKeyRef = useRef('')

  const acceptedApplications = useMemo(
    () => applications.filter((a) => String(a.status || '').toLowerCase() === 'accepted' && a.propertyId != null),
    [applications],
  )

  const primaryApplication = useMemo(() => {
    if (!acceptedApplications.length) return null
    return [...acceptedApplications].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return tb - ta
    })[0]
  }, [acceptedApplications])

  const propertyName =
    primaryApplication?.propertyName || (primaryApplication ? `Property #${primaryApplication.propertyId}` : '')

  const monthlyRent = useMemo(() => {
    const n = Number(rentCalendarMonthlyRent)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [rentCalendarMonthlyRent])

  const loadApplications = useCallback(async () => {
    const token = localStorage.getItem('mysewa_token')
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/applications/for-student', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Failed to load applications (HTTP ${res.status})`)
      setApplications(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setApplications([])
      pushToast({ message: e.message || 'Unable to load payments.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, pushToast])

  useEffect(() => {
    if (user?.id) loadApplications()
  }, [user?.id, loadApplications])

  useEffect(() => {
    if (searchParams.get('deposit') !== 'return') return
    pushToast({
      message: 'Returned from ToyyibPay. If payment succeeded, your deposit status should update shortly.',
      type: 'success',
    })
    setSearchParams({}, { replace: true })
    loadApplications()
  }, [searchParams, setSearchParams, pushToast, loadApplications])

  const loadRentCalendar = useCallback(
    async (opts) => {
      const token = localStorage.getItem('mysewa_token')
      if (!token || !primaryApplication?.id) return null
      const rawY = opts?.yearOverride
      const year = rawY != null && Number.isFinite(Number(rawY)) ? Number(rawY) : payYear
      const updateView = opts?.updateView !== false
      if (updateView) setRentCalendarLoading(true)
      try {
        const res = await fetch(
          `/api/v1/applications/${encodeURIComponent(primaryApplication.id)}/rent-months?year=${year}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Could not load rent calendar (${res.status})`)
        if (opts?.updateView !== false) {
          if (Array.isArray(data.paidMonths)) setPaidMonths(data.paidMonths.map((n) => Number(n)))
          if (Array.isArray(data.studentRentPaymentLogs)) setStudentRentPaymentLogs(data.studentRentPaymentLogs)
          else setStudentRentPaymentLogs([])
          if (Array.isArray(data.rentMonthRecords)) setRentMonthRecords(data.rentMonthRecords)
          if (data.monthlyRent != null && Number.isFinite(Number(data.monthlyRent))) {
            setRentCalendarMonthlyRent(Number(data.monthlyRent))
          }
          setLeaseRange(parseLeaseRange(data.preferredMoveIn, data.leaseEnd ?? data.leaseEndDate))
        }
        return { year, ...data }
      } catch (e) {
        if (opts?.updateView !== false) {
          setPaidMonths([])
          setStudentRentPaymentLogs([])
          setRentMonthRecords([])
        }
        pushToast({ message: e.message || 'Could not load rent calendar.', type: 'error' })
        return null
      } finally {
        if (updateView) setRentCalendarLoading(false)
      }
    },
    [primaryApplication?.id, payYear, pushToast],
  )

  useEffect(() => {
    if (!primaryApplication?.id) {
      setPaidMonths([])
      setStudentRentPaymentLogs([])
      setRentMonthRecords([])
      setLeaseRange(null)
      setAllYearRentData([])
      return
    }
    loadRentCalendar()
  }, [primaryApplication?.id, payYear, loadRentCalendar])

  useEffect(() => {
    if (!primaryApplication?.id || !leaseRange) {
      setAllYearRentData([])
      return
    }
    const { minY, maxY } = leaseRange
    let cancelled = false

    async function loadAllYears() {
      const payloads = []
      for (let y = minY; y <= maxY; y += 1) {
        const data = await loadRentCalendar({ yearOverride: y, updateView: false })
        if (cancelled) return
        if (data) payloads.push(data)
      }
      if (!cancelled) setAllYearRentData(payloads)
    }

    loadAllYears()
    return () => {
      cancelled = true
    }
  }, [primaryApplication?.id, leaseRange, loadRentCalendar])

  useEffect(() => {
    if (searchParams.get('rentToyyibReturn') !== '1' || !primaryApplication?.id) return
    const y = Number(searchParams.get('year'))
    const validY = Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : null
    pushToast({
      message: 'Returned from ToyyibPay for rent. Refresh if the calendar does not update.',
      type: 'success',
    })
    setSearchParams({}, { replace: true })
    if (validY != null) setPayYear(validY)
    loadRentCalendar(validY != null ? { yearOverride: validY } : undefined)
  }, [searchParams, setSearchParams, pushToast, loadRentCalendar, primaryApplication?.id])

  useEffect(() => {
    if (!leaseRange || !primaryApplication?.id) return
    const key = `${primaryApplication.id}-${leaseRange.minY}-${leaseRange.maxY}`
    if (leaseClampKeyRef.current === key) return
    leaseClampKeyRef.current = key
    setPayYear((y) => Math.min(leaseRange.maxY, Math.max(leaseRange.minY, y)))
  }, [leaseRange, primaryApplication?.id])

  function mergeApplicationRow(updated) {
    if (!updated?.id) return
    setApplications((prev) =>
      prev.map((row) => {
        if (Number(row.id) !== Number(updated.id)) return row
        const merged = { ...row, ...updated }
        if (updated.depositPaid !== undefined) merged.depositPaid = updated.depositPaid
        else merged.depositPaid = true
        return merged
      }),
    )
  }

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
    return `Tenancy: ${formatDateShort(leaseRange.moveIn)} → ${formatDateShort(leaseRange.moveOut)}`
  }, [leaseRange])

  const paymentHistory = useMemo(() => {
    if (!primaryApplication) return []
    const rows = []
    const depositAmt = resolvedStudentDepositAmount(primaryApplication)
    if (depositAmt) {
      rows.push({
        id: `dep-${primaryApplication.id}`,
        date: primaryApplication.depositPaid
          ? primaryApplication.updatedAt
          : primaryApplication.createdAt,
        propertyName,
        type: 'Deposit',
        amount: depositAmt,
        status: primaryApplication.depositPaid ? 'paid' : 'pending',
        sortAt: new Date(
          primaryApplication.depositPaid ? primaryApplication.updatedAt : primaryApplication.createdAt || 0,
        ).getTime(),
      })
    }

    const rent = monthlyRent || 0
    for (const payload of allYearRentData) {
      const year = Number(payload.year)
      const paid = Array.isArray(payload.paidMonths) ? payload.paidMonths.map(Number) : []
      const records = Array.isArray(payload.rentMonthRecords) ? payload.rentMonthRecords : []
      const logs = Array.isArray(payload.studentRentPaymentLogs) ? payload.studentRentPaymentLogs : []
      const recordMap = new Map(records.map((r) => [Number(r.month), r]))

      for (let m = 1; m <= 12; m += 1) {
        if (!leaseRange || !monthOverlapsLease(year, m, leaseRange)) continue
        const rec = recordMap.get(m)
        const unavailable = rec?.monthState === 'unavailable'
        if (unavailable) continue
        const isPaid = paid.includes(m)
        const log = logs.find((l) => Number(l.month) === m)
        const amount = Number(rec?.amount) > 0 ? Number(rec.amount) : rent
        if (!amount) continue

        rows.push({
          id: `rent-${year}-${m}`,
          date: log?.loggedAt || monthDueDate(year, m).toISOString(),
          propertyName,
          type: 'Rent',
          amount,
          status: isPaid ? 'paid' : 'pending',
          sortAt: monthDueDate(year, m).getTime(),
        })
      }
    }

    return rows.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
  }, [primaryApplication, propertyName, monthlyRent, allYearRentData, leaseRange])

  const summary = useMemo(() => {
    let totalPaid = 0
    let pending = 0
    let nextPaymentAmount = 0
    let nextDueDate = null
    let nextDueLabel = 'Next Payment'

    if (primaryApplication) {
      const depositAmt = resolvedStudentDepositAmount(primaryApplication) || 0
      if (primaryApplication.depositPaid) totalPaid += depositAmt
      else {
        pending += depositAmt
        nextPaymentAmount = depositAmt
        nextDueDate = primaryApplication.preferredMoveIn
          ? new Date(`${primaryApplication.preferredMoveIn}T12:00:00`)
          : new Date()
        nextDueLabel = `Due: ${nextDueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      }
    }

    const rent = monthlyRent || 0
    if (leaseRange && rent > 0) {
      const candidates = []
      for (const payload of allYearRentData) {
        const year = Number(payload.year)
        const paid = Array.isArray(payload.paidMonths) ? payload.paidMonths.map(Number) : []
        const records = Array.isArray(payload.rentMonthRecords) ? payload.rentMonthRecords : []
        const recordMap = new Map(records.map((r) => [Number(r.month), r]))

        for (let m = 1; m <= 12; m += 1) {
          if (!monthOverlapsLease(year, m, leaseRange)) continue
          const rec = recordMap.get(m)
          if (rec?.monthState === 'unavailable') continue
          const due = monthDueDate(year, m)
          if (paid.includes(m)) {
            totalPaid += Number(rec?.amount) > 0 ? Number(rec.amount) : rent
          } else {
            pending += Number(rec?.amount) > 0 ? Number(rec.amount) : rent
            candidates.push({ due, amount: Number(rec?.amount) > 0 ? Number(rec.amount) : rent })
          }
        }
      }

      candidates.sort((a, b) => a.due.getTime() - b.due.getTime())
      const nextRent = candidates.find((c) => c.due.getTime() >= Date.now()) || candidates[0]
      if (nextRent && (!nextDueDate || nextRent.due.getTime() < nextDueDate.getTime())) {
        nextPaymentAmount = nextRent.amount
        nextDueLabel = `Due: ${nextRent.due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      }
    }

    return { totalPaid, pending, nextPaymentAmount, nextDueLabel }
  }, [primaryApplication, monthlyRent, allYearRentData, leaseRange])

  function onRentMonthClick(m) {
    if (!leaseRange) {
      pushToast({ message: 'Rent calendar is still loading.', type: 'info' })
      return
    }
    if (!monthOverlapsLease(payYear, m, leaseRange)) {
      pushToast({ message: 'That month is outside your tenancy.', type: 'info' })
      return
    }
    const rec = recordByMonth.get(m)
    const unavailable = rec?.monthState === 'unavailable'
    const paid = paidMonths.includes(m) && !unavailable
    if (paid) {
      pushToast({ message: `${MONTH_SHORT[m - 1]} ${payYear} is marked paid.`, type: 'success' })
      return
    }
    if (unavailable) {
      pushToast({ message: `${MONTH_SHORT[m - 1]} ${payYear} is unavailable.`, type: 'info' })
      return
    }
    setPayRentHintMonth(m)
  }

  function handleLogPayment() {
    const next = monthCells.find((cell) => !cell.outsideLease && !cell.paid && !cell.unavailable)
    if (!next) {
      pushToast({ message: 'No pending rent months to log.', type: 'info' })
      return
    }
    onRentMonthClick(next.m)
  }

  const onRentCalendarSaved = useCallback(
    (data) => {
      if (data) {
        if (Array.isArray(data.studentRentPaymentLogs)) {
          setStudentRentPaymentLogs(data.studentRentPaymentLogs)
        }
        if (Array.isArray(data.paidMonths)) setPaidMonths(data.paidMonths.map((n) => Number(n)))
        if (Array.isArray(data.rentMonthRecords)) setRentMonthRecords(data.rentMonthRecords)
      } else {
        loadRentCalendar()
      }
    },
    [loadRentCalendar],
  )

  if (authLoading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[40vh] items-center justify-center bg-[#FAFAFA]">
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </div>
      </StudentLayout>
    )
  }

  if (authError) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Error: {authError}
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
          monthlyRent={rentCalendarMonthlyRent ?? null}
          existingLog={studentRentPaymentLogs.find((l) => Number(l.month) === payRentHintMonth) ?? null}
          studentName={user?.fullName}
          isPaid={paidMonths.includes(payRentHintMonth)}
          onClose={() => setPayRentHintMonth(null)}
          onSaved={onRentCalendarSaved}
        />
      ) : null}

      <StudentPayments
        loading={loading}
        primaryApplication={primaryApplication}
        propertyName={propertyName}
        summary={summary}
        paymentHistory={paymentHistory}
        payYear={payYear}
        yearOptions={yearOptions}
        monthCells={monthCells}
        rentCalendarLoading={rentCalendarLoading}
        rentCalendarTenancyLine={rentCalendarTenancyLine}
        payRentHintMonth={payRentHintMonth}
        onPayDeposit={() => primaryApplication && setDepositModalApp(primaryApplication)}
        onYearChange={setPayYear}
        onMonthClick={onRentMonthClick}
        onLogPayment={handleLogPayment}
        onBrowseProperties={() => navigate('/properties')}
      />
    </StudentLayout>
  )
}
