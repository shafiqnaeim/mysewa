import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import LandlordLayout from '../components/LandlordLayout'
import LandlordRentMonthModal from '../components/LandlordRentMonthModal'
import { useLandlordGuard } from '../hooks/useLandlordGuard'
import { useToast } from '../context/ToastContext'
import { formatDateShort, monthOverlapsLease, parseLeaseRange } from '../utils/rentCalendarUtils'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function applyYearPayload(setPaidMonths, setRentMonthRecords, setStudentRentPaymentLogs, data) {
  if (Array.isArray(data.paidMonths)) setPaidMonths(data.paidMonths.map((n) => Number(n)))
  if (Array.isArray(data.rentMonthRecords)) setRentMonthRecords(data.rentMonthRecords)
  if (Array.isArray(data.studentRentPaymentLogs)) setStudentRentPaymentLogs(data.studentRentPaymentLogs)
}

export default function LandlordRentCalendarPage() {
  const { applicationId, bookingId } = useParams()
  const location = useLocation()
  const appId = applicationId != null ? Number(applicationId) : bookingId != null ? Number(bookingId) : Number.NaN
  const backTo = location.pathname.startsWith('/dashboard/landlord')
    ? '/dashboard/landlord/applications'
    : '/my-properties'
  const { loading: authLoading, error: authError } = useLandlordGuard()
  const { pushToast } = useToast()

  const today = useMemo(() => new Date(), [])
  const [payYear, setPayYear] = useState(() => today.getFullYear())
  const [meta, setMeta] = useState(null)
  const [leaseRange, setLeaseRange] = useState(null)
  const [paidMonths, setPaidMonths] = useState([])
  const [rentMonthRecords, setRentMonthRecords] = useState([])
  const [studentRentPaymentLogs, setStudentRentPaymentLogs] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [rentModalMonth, setRentModalMonth] = useState(null)
  const leaseYearClampKeyRef = useRef('')

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mysewa_token') : ''

  const loadYear = useCallback(async () => {
    if (!token || !Number.isFinite(appId)) return
    setPageLoading(true)
    try {
      const res = await fetch(`/api/v1/applications/${encodeURIComponent(appId)}/rent-months?year=${payYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Could not load calendar (${res.status})`)
      setMeta({
        propertyName: data.propertyName,
        studentName: data.studentName,
        monthlyRent: data.monthlyRent,
        preferredMoveIn: data.preferredMoveIn ?? null,
        leaseEnd: data.leaseEnd ?? data.leaseEndDate ?? null,
      })
      const range = parseLeaseRange(data.preferredMoveIn, data.leaseEnd ?? data.leaseEndDate)
      setLeaseRange(range)
      applyYearPayload(setPaidMonths, setRentMonthRecords, setStudentRentPaymentLogs, data)
    } catch (e) {
      setMeta(null)
      setLeaseRange(null)
      setPaidMonths([])
      setRentMonthRecords([])
      setStudentRentPaymentLogs([])
      pushToast({ message: e.message || 'Failed to load rent calendar.', type: 'error' })
    } finally {
      setPageLoading(false)
    }
  }, [appId, payYear, token, pushToast])

  useEffect(() => {
    if (!Number.isFinite(appId)) {
      setPageLoading(false)
      return
    }
    loadYear()
  }, [appId, loadYear])

  useEffect(() => {
    if (!leaseRange || !Number.isFinite(appId)) return
    const key = `${appId}-${leaseRange.minY}-${leaseRange.maxY}-${leaseRange.moveIn.getTime()}-${leaseRange.moveOut.getTime()}`
    if (leaseYearClampKeyRef.current === key) return
    leaseYearClampKeyRef.current = key
    setPayYear((y) => Math.min(leaseRange.maxY, Math.max(leaseRange.minY, y)))
  }, [leaseRange, appId])

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
      return {
        label,
        m: monthNum,
        key: `${payYear}-${m}`,
        paid,
        unavailable,
        outsideLease: leaseRange ? !inLease : true,
      }
    })
  }, [payYear, paidMonths, leaseRange, recordByMonth])

  function onMonthClick(m) {
    if (!Number.isFinite(appId)) return
    if (!monthOverlapsLease(payYear, m, leaseRange)) {
      pushToast({ message: 'That month is outside this tenancy (move-in through lease end).', type: 'info' })
      return
    }
    setRentModalMonth(m)
  }

  const rentLine =
    meta?.monthlyRent != null && Number.isFinite(Number(meta.monthlyRent))
      ? `RM ${Number(meta.monthlyRent).toFixed(0)} / month (from listing)`
      : 'Monthly rent not set on listing — amounts are for your own tracking only.'

  const tenancyLine =
    leaseRange != null
      ? `Tenancy: ${formatDateShort(leaseRange.moveIn)} → ${formatDateShort(leaseRange.moveOut)} (only months in this range can be recorded).`
      : meta?.preferredMoveIn || meta?.leaseEnd
        ? 'Move-in or lease-end dates on this application could not be read. Rent months cannot be aligned to the lease.'
        : 'This application has no move-in / lease-end on file; rent tracking needs those dates from the student’s application.'

  const leadParts = []
  if (Number.isFinite(appId)) leadParts.push(`Application #${appId}`)
  if (meta?.studentName) leadParts.push(meta.studentName)
  if (meta?.propertyName) leadParts.push(meta.propertyName)
  const headerLead =
    leadParts.length > 0 ? leadParts.join(' · ') : 'Record which months this student has paid rent.'

  const modalExisting = rentModalMonth != null ? recordByMonth.get(rentModalMonth) : null
  const modalStudentPaymentLog = useMemo(() => {
    if (rentModalMonth == null) return null
    return studentRentPaymentLogs.find((l) => Number(l.month) === rentModalMonth) ?? null
  }, [rentModalMonth, studentRentPaymentLogs])
  const modalMonthLabel =
    rentModalMonth != null ? `${MONTH_SHORT[rentModalMonth - 1]} ${payYear}` : ''

  const pageBody = () => {
    if (authLoading) {
      return <p className="my-property-loading">Loading…</p>
    }
    if (authError) {
      return <p className="student-dash-muted">{authError}</p>
    }
    if (!Number.isFinite(appId)) {
      return <p className="student-dash-muted">Invalid application link.</p>
    }
    if (pageLoading && !meta) {
      return <p className="my-property-loading">Loading calendar…</p>
    }
    return (
      <section className="my-property-list-section" aria-labelledby="landlord-rent-tracker-body-heading">
        <h2 id="landlord-rent-tracker-body-heading" className="my-property-list-title">
          Calendar
        </h2>
        <p className="student-dash-muted landlord-rent-tracker-intro">
          Months follow the rental period from <strong>move-in</strong> through <strong>lease end (move out)</strong>.
          Tap an in-range month and use <strong>Mark as Paid</strong> when rent is received — the system uses your
          listing&apos;s monthly rent and standard payment context (no per-month setup). Use{' '}
          <strong>Mark as Unavailable</strong> only for a special case when no rent is expected that month (for example a
          gap or agreed waiver).
        </p>
        <p className="student-dash-muted landlord-rent-tracker-rentline">{tenancyLine}</p>
        <p className="student-dash-muted landlord-rent-tracker-rentline">{rentLine}</p>
        {yearOptions.length > 0 ? (
          <div className="student-myproperty-pay-toolbar">
            <label className="student-myproperty-year-label" htmlFor="landlord-rent-year">
              Year
            </label>
            <select
              id="landlord-rent-year"
              className="student-myproperty-year-select"
              value={payYear}
              onChange={(e) => setPayYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="student-dash-muted landlord-rent-tracker-rentline">No calendar years available for this lease.</p>
        )}
        <div className="student-myproperty-month-grid" role="list">
          {monthCells.map((cell) => (
            <button
              key={cell.key}
              type="button"
              role="listitem"
              disabled={cell.outsideLease || rentModalMonth != null}
              className={[
                'student-myproperty-month-btn',
                cell.outsideLease
                  ? 'student-myproperty-month-btn--future'
                  : cell.paid
                    ? 'student-myproperty-month-btn--paid'
                    : cell.unavailable
                      ? 'student-myproperty-month-btn--unavailable'
                      : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onMonthClick(cell.m)}
              title={
                cell.outsideLease
                  ? 'Outside tenancy (move-in — lease end)'
                  : cell.paid
                    ? 'Recorded as paid — tap to view or edit'
                    : cell.unavailable
                      ? 'Marked unavailable — tap to change or mark paid'
                      : 'Tap to mark paid or unavailable'
              }
            >
              <span className="student-myproperty-month-label">{cell.label}</span>
              <span className="student-myproperty-month-status">
                {cell.paid ? 'Paid' : cell.outsideLease ? '—' : cell.unavailable ? 'N/A' : 'Set up'}
              </span>
            </button>
          ))}
        </div>
        <ul className="student-myproperty-legend">
          <li>
            <span className="student-myproperty-legend-swatch student-myproperty-month-btn--paid" /> Paid
          </li>
          <li>
            <span className="student-myproperty-legend-swatch student-myproperty-month-btn--unavailable" /> Unavailable
          </li>
          <li>
            <span className="student-myproperty-legend-swatch student-myproperty-month-btn--future" /> Outside tenancy
          </li>
        </ul>
      </section>
    )
  }

  return (
    <LandlordLayout>
        <article className="my-properties-page">
          <header className="my-property-page-header" aria-labelledby="landlord-rent-tracker-title">
            <div className="my-property-page-header-main">
              <h1 id="landlord-rent-tracker-title" className="my-property-page-title">
                Monthly Rent Tracker
              </h1>
              <p className="my-property-page-lead">{headerLead}</p>
            </div>
            <div className="my-property-page-header-actions">
              <Link to={backTo} className="my-property-page-cta">
                {backTo.includes('/applications') ? 'Back to Applications' : 'Back to My properties'}
              </Link>
            </div>
          </header>

          {pageBody()}
        </article>

      {rentModalMonth != null && Number.isFinite(appId) ? (
        <LandlordRentMonthModal
          applicationId={appId}
          year={payYear}
          month={rentModalMonth}
          monthLabel={modalMonthLabel}
          propertyName={meta?.propertyName}
          defaultAmountHint={meta?.monthlyRent}
          existingRecord={
            modalExisting
              ? {
                  amount: modalExisting.amount,
                  channel: modalExisting.channel,
                  monthState: modalExisting.monthState === 'unavailable' ? 'unavailable' : 'received',
                }
              : null
          }
          studentPaymentLog={modalStudentPaymentLog}
          onClose={() => setRentModalMonth(null)}
          onSaved={(data) => applyYearPayload(setPaidMonths, setRentMonthRecords, setStudentRentPaymentLogs, data)}
        />
      ) : null}
    </LandlordLayout>
  )
}
