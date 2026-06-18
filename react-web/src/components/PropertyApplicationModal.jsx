import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PropertyRatingBox from './PropertyRatingBox'
import { getCampusDisplayName } from '../utils/propertyLocation'
import {
  formatCapacityLine,
  formatPropertyLocationLine,
  listPropertyImageUrls,
  propertyStatusLabel,
} from '../utils/propertyDisplay'

function statusClass(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked') return 'pv-status--rented'
  if (s === 'maintenance') return 'pv-status--maintenance'
  return 'pv-status--available'
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="10" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8.5" r="2.75" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16.5" cy="9.5" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4.5 18.5c.75-2.75 2.75-4 4.5-4s3.75 1.25 4.5 4M13.5 18.5c.5-2 1.75-3.25 3-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconCampus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 20V8l7-4 7 4v12M9 20v-6h6v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const AVG_DAYS_PER_MONTH = 365.25 / 12

/** First day of the next calendar month — earliest move-in (e.g. 10 Jun → 1 Jul). */
function earliestBookYMD() {
  const t = new Date()
  const firstNext = new Date(t.getFullYear(), t.getMonth() + 1, 1)
  const z = (n) => String(n).padStart(2, '0')
  return `${firstNext.getFullYear()}-${z(firstNext.getMonth() + 1)}-${z(firstNext.getDate())}`
}

function defaultViewMonthFromEarliest() {
  const p = parseYMD(earliestBookYMD())
  if (p) return { y: p.getFullYear(), m: p.getMonth() }
  const t = new Date()
  return { y: t.getFullYear(), m: t.getMonth() }
}

function parseYMD(s) {
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return dt
}

function addDaysYMD(ymd, deltaDays) {
  const d = parseYMD(ymd)
  if (!d) return ''
  d.setDate(d.getDate() + deltaDays)
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

/** Full calendar days between move-in (inclusive) and lease end (exclusive of end day as "night of" — we use end date as last day of tenancy). */
function leaseSpanDays(moveIn, leaseEnd) {
  const a = parseYMD(moveIn)
  const b = parseYMD(leaseEnd)
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/** Integer months for API (1–120), from date span. */
function leaseMonthsFromDates(moveIn, leaseEnd) {
  const days = leaseSpanDays(moveIn, leaseEnd)
  if (days == null || days < 1) return null
  return Math.min(120, Math.max(1, Math.round(days / AVG_DAYS_PER_MONTH)))
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Same weekday order as {@link PropertyAvailabilityCalendar} (Monday first). */
const WEEKDAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_LABELS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ymdFromParts(y, monthIndex0, day) {
  const z = (n) => String(n).padStart(2, '0')
  return `${y}-${z(monthIndex0 + 1)}-${z(day)}`
}

function formatYmdForDisplay(ymd) {
  const p = parseYMD(ymd)
  if (!p) return ymd
  return p.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function canGoPrevMonth(viewY, viewM, earliestYmd) {
  const em = parseYMD(earliestYmd)
  if (!em) return true
  const prev = new Date(viewY, viewM - 1, 1)
  return prev.getFullYear() > em.getFullYear() || (prev.getFullYear() === em.getFullYear() && prev.getMonth() >= em.getMonth())
}

function canGoPrevYear(viewY, earliestYmd) {
  const em = parseYMD(earliestYmd)
  if (!em) return true
  return viewY > em.getFullYear()
}

function monthFullyBeforeEarliest(year, monthIndex0, earliestYmd) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate()
  const lastYmd = ymdFromParts(year, monthIndex0, lastDay)
  return lastYmd < earliestYmd
}

function calendarAnchorMonday(year, month) {
  const first = new Date(year, month, 1)
  const dow = first.getDay()
  const offsetMon0 = (dow + 6) % 7
  const anchor = new Date(first)
  anchor.setDate(first.getDate() - offsetMon0)
  return anchor
}

function monthTitleLong(year, month0) {
  return new Date(year, month0, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

/** 42 cells, Monday-first week row (same grid math as listing View calendar). */
function buildMonthGridCellsMonday(viewYear, viewMonth0) {
  const anchor = calendarAnchorMonday(viewYear, viewMonth0)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(anchor)
    d.setDate(anchor.getDate() + i)
    const inMonth = d.getMonth() === viewMonth0 && d.getFullYear() === viewYear
    const z = (n) => String(n).padStart(2, '0')
    const ymd = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
    cells.push({ ymd, label: d.getDate(), inMonth })
  }
  return cells
}

function rangeTouchesMonth(year, month0, startYmd, endYmd) {
  if (!startYmd || !endYmd) return false
  const first = ymdFromParts(year, month0, 1)
  const lastDay = new Date(year, month0 + 1, 0).getDate()
  const last = ymdFromParts(year, month0, lastDay)
  return !(endYmd < first || startYmd > last)
}

function isYmdInRange(ymd, start, end) {
  if (!start || !end || ymd < start || ymd > end) return false
  return true
}

const initialForm = {
  preferredMoveIn: '',
  leaseEndDate: '',
}

const AGREEMENT_ITEMS = [
  {
    id: 'truthful',
    label: 'I confirm the information I provide is accurate to the best of my knowledge.',
  },
  {
    id: 'reviewed',
    label: 'I have reviewed this listing’s description, photos, price, and location.',
  },
  {
    id: 'process',
    label: 'I understand that the landlord decides on acceptance, deposit, and next steps through MySewa.',
  },
]

function createInitialAgreementChecks() {
  return Object.fromEntries(AGREEMENT_ITEMS.map((item) => [item.id, false]))
}

/**
 * Student applies to rent a listing — POST /api/v1/applications (requires student JWT).
 * Layout and chrome match PropertyViewModal (pv-backdrop, pv-dialog, pv-scroll, pv-layout, pv-body).
 */
export default function PropertyApplicationModal({ property, onClose, onSuccess, pushToast }) {
  const [form, setForm] = useState(initialForm)
  const [calendarZoom, setCalendarZoom] = useState('month')
  const [viewMonth, setViewMonth] = useState(() => defaultViewMonthFromEarliest())
  const [submitting, setSubmitting] = useState(false)
  const [me, setMe] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [agreementChecks, setAgreementChecks] = useState(() => createInitialAgreementChecks())

  const images = listPropertyImageUrls(property)
  const activeImage = images[photoIndex] || null
  const locationShort = formatPropertyLocationLine(property)
  const capacityLine = formatCapacityLine(property)
  const campusName = getCampusDisplayName(property.campus) || property.campus
  const chip = propertyStatusLabel(property.status)

  useEffect(() => {
    setForm(initialForm)
    setAgreementChecks(createInitialAgreementChecks())
    setCalendarZoom('month')
    setPhotoIndex(0)
    setViewMonth(defaultViewMonthFromEarliest())

    let cancelled = false
    async function loadMe() {
      setAuthChecked(false)
      const token = localStorage.getItem('mysewa_token')
      if (!token) {
        if (!cancelled) {
          setMe(null)
          setAuthChecked(true)
        }
        return
      }
      try {
        const res = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && data.user) setMe(data.user)
        else if (!cancelled) setMe(null)
      } catch {
        if (!cancelled) setMe(null)
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    }
    loadMe()
    return () => {
      cancelled = true
    }
  }, [property?.id])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const calCells = useMemo(() => buildMonthGridCellsMonday(viewMonth.y, viewMonth.m), [viewMonth.y, viewMonth.m])
  const selectionDurationMonths = useMemo(
    () => leaseMonthsFromDates(form.preferredMoveIn, form.leaseEndDate),
    [form.preferredMoveIn, form.leaseEndDate]
  )
  const selectionDurationDays = useMemo(
    () => leaseSpanDays(form.preferredMoveIn, form.leaseEndDate),
    [form.preferredMoveIn, form.leaseEndDate]
  )
  const allAgreementChecked = useMemo(
    () => AGREEMENT_ITEMS.every((item) => agreementChecks[item.id]),
    [agreementChecks]
  )
  const earliestMin = earliestBookYMD()
  const todayRef = new Date()
  const todayYear = todayRef.getFullYear()
  const todayMonth0 = todayRef.getMonth()

  if (!property) return null

  const propertyLabel = property.name?.trim() || 'This listing'
  const isStudent = me && String(me.role || '').toLowerCase() === 'student'
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('mysewa_token')

  function showPrevPhoto() {
    if (images.length < 2) return
    setPhotoIndex((i) => (i - 1 + images.length) % images.length)
  }

  function showNextPhoto() {
    if (images.length < 2) return
    setPhotoIndex((i) => (i + 1) % images.length)
  }

  function handleDayPick(ymd) {
    if (ymd < earliestBookYMD()) return
    setForm((f) => {
      const s0 = f.preferredMoveIn
      const e0 = f.leaseEndDate
      if (!s0) {
        return { ...f, preferredMoveIn: ymd, leaseEndDate: '' }
      }
      if (!e0) {
        if (ymd <= s0) {
          return { ...f, preferredMoveIn: ymd, leaseEndDate: '' }
        }
        const maxEnd = addDaysYMD(s0, 365 * 10 + 1)
        if (ymd > maxEnd) return f
        return { ...f, leaseEndDate: ymd }
      }
      return { ...f, preferredMoveIn: ymd, leaseEndDate: '' }
    })
  }

  function shiftViewMonth(delta) {
    setViewMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function shiftViewYear(delta) {
    setViewMonth((c) => ({ ...c, y: c.y + delta }))
  }

  function openMonthFromYear(monthIndex) {
    setViewMonth((c) => ({ ...c, m: monthIndex }))
    setCalendarZoom('month')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const token = localStorage.getItem('mysewa_token')
    if (!token) {
      pushToast({ message: 'Please sign in with a student account to apply.', type: 'info', duration: 6000 })
      return
    }
    if (!isStudent) {
      pushToast({
        message: 'Only verified student accounts can submit applications. Sign in as a student or register as one.',
        type: 'error',
        duration: 7000,
      })
      return
    }
    if (!AGREEMENT_ITEMS.every((item) => agreementChecks[item.id])) {
      pushToast({ message: 'Please tick all agreement items before you submit.', type: 'error', duration: 6000 })
      return
    }

    const moveIn = form.preferredMoveIn.trim()
    const leaseEnd = form.leaseEndDate.trim()
    if (!moveIn) {
      pushToast({ message: 'Please choose your Move In date.', type: 'error' })
      return
    }
    const earliest = earliestBookYMD()
    if (parseYMD(moveIn) < parseYMD(earliest)) {
      pushToast({
        message: `Move In must be on or after ${formatYmdForDisplay(earliest)} (first day of next month).`,
        type: 'error',
      })
      return
    }
    if (!leaseEnd) {
      pushToast({ message: 'Please choose your Move Out date on the calendar.', type: 'error' })
      return
    }
    const days = leaseSpanDays(moveIn, leaseEnd)
    if (days == null || days < 1) {
      pushToast({ message: 'Move Out must be after your Move In date.', type: 'error' })
      return
    }
    const leaseMonths = leaseMonthsFromDates(moveIn, leaseEnd)
    if (leaseMonths == null) {
      pushToast({ message: 'Could not determine lease length — check your dates.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId: property.id,
          preferredMoveIn: moveIn,
          leaseEndDate: leaseEnd,
          leaseMonths,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || `Request failed (HTTP ${res.status})`)
      }
      pushToast({
        message: `Application sent for “${propertyLabel}”. The landlord can review it in myProperty.`,
        type: 'success',
        duration: 6500,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      pushToast({ message: err.message || 'Unable to submit application.', type: 'error', duration: 7000 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pv-backdrop" role="presentation">
      <article className="pv-dialog pv-dialog--apply" role="dialog" aria-modal="true" aria-labelledby="rent-apply-title">
        <header className="pv-header pv-header--close-only">
          <button type="button" className="pv-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="pv-apply-form" onSubmit={handleSubmit}>
          <div className="pv-scroll">
            <div className="pv-layout">
              <div className="pv-media">
                <div className="pv-gallery">
                  {activeImage ? (
                    <img src={activeImage} alt="" className="pv-gallery-img" />
                  ) : (
                    <div className="pv-gallery-empty">
                      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                        <path d="M3 16l5-4 4 3 4-5 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>No photo yet</span>
                    </div>
                  )}

                  <div className="pv-gallery-badges">
                    <span className={`pv-status ${statusClass(property.status)}`}>{chip}</span>
                    {property.type ? <span className="pv-type">{property.type}</span> : null}
                  </div>

                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="pv-gallery-nav pv-gallery-nav--prev"
                        onClick={showPrevPhoto}
                        aria-label="Previous photo"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="pv-gallery-nav pv-gallery-nav--next"
                        onClick={showNextPhoto}
                        aria-label="Next photo"
                      >
                        ›
                      </button>
                      <div className="pv-gallery-dots" aria-hidden="true">
                        {images.map((_, i) => (
                          <span key={i} className={`pv-gallery-dot${i === photoIndex ? ' pv-gallery-dot--on' : ''}`} />
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>

                {images.length > 1 ? (
                  <div className="pv-thumbs" aria-label="Photo gallery">
                    {images.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        className={`pv-thumb${i === photoIndex ? ' pv-thumb--on' : ''}`}
                        onClick={() => setPhotoIndex(i)}
                        aria-label={`Photo ${i + 1}`}
                        aria-current={i === photoIndex}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="pv-body">
                <div className="pv-intro">
                  <div className="pv-intro-main">
                    <h2 id="rent-apply-title" className="pv-property-title">
                      {propertyLabel}
                    </h2>
                    <PropertyRatingBox item={property} size="lg" />
                  </div>
                </div>

                <ul className="pv-facts">
                  <li>
                    <span className="pv-fact-icon">
                      <IconPin />
                    </span>
                    <span>{locationShort}</span>
                  </li>
                  <li>
                    <span className="pv-fact-icon">
                      <IconPeople />
                    </span>
                    <span>{capacityLine}</span>
                  </li>
                  {campusName ? (
                    <li>
                      <span className="pv-fact-icon">
                        <IconCampus />
                      </span>
                      <span>Near {campusName}</span>
                    </li>
                  ) : null}
                </ul>

                <div className="pv-monthly-rent-callout" aria-label="Monthly rent">
                  {property.price != null && !Number.isNaN(Number(property.price)) ? (
                    <>
                      <span className="pv-monthly-rent-amount">RM {Number(property.price).toFixed(0)}</span>
                      <span className="pv-monthly-rent-suffix">/month</span>
                    </>
                  ) : (
                    <span className="pv-monthly-rent-unset">Price not set</span>
                  )}
                </div>

                <section className="pv-section pv-section--agreement" aria-labelledby="pv-agreement-heading">
                  <h3 id="pv-agreement-heading" className="pv-section-title">
                    Agreement
                  </h3>
                  <ul className="pv-agreement-checklist">
                    {AGREEMENT_ITEMS.map((item) => (
                      <li key={item.id}>
                        <label className="pv-agreement-label">
                          <input
                            type="checkbox"
                            checked={Boolean(agreementChecks[item.id])}
                            onChange={(e) =>
                              setAgreementChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))
                            }
                            disabled={submitting}
                          />
                          <span>{item.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="pv-section">
                  <h3 className="pv-section-title">Rental application</h3>
                </section>

                <div className="rent-apply-banner-wrap">
                  {!authChecked ? (
                    <p className="rent-apply-banner rent-apply-banner--muted">Checking your sign-in…</p>
                  ) : !hasToken ? (
                    <p className="rent-apply-banner">
                      Sign in as a student to apply.{' '}
                      <Link to="/signin">Sign in</Link> · <Link to="/signup">Register</Link>
                    </p>
                  ) : hasToken && !me ? (
                    <p className="rent-apply-banner rent-apply-banner--warn">
                      Could not load your account. <Link to="/signin">Try again</Link>
                    </p>
                  ) : !isStudent ? (
                    <p className="rent-apply-banner rent-apply-banner--warn">
                      You are signed in as <strong>{me?.role || 'user'}</strong>. Use a <strong>student</strong> account
                      to submit.
                    </p>
                  ) : (
                    <p className="rent-apply-banner rent-apply-banner--ok">
                      Applying as <strong>{me?.fullName || me?.email}</strong>
                    </p>
                  )}
                </div>

                <section className="pv-section pv-section--rent-calendar">
                  <h3 className="pv-section-title">Move In &amp; Move Out</h3>

                  <div
                    className={`pv-rent-calendar-shell pv-availability-cal${
                      calendarZoom === 'year' ? ' pv-availability-cal--year-zoom' : ' pv-availability-cal--month-zoom'
                    }`}
                  >
                    <div className="pv-availability-cal__toolbar">
                      <div className="pv-availability-cal__zoom-toggle" role="group" aria-label="Calendar scale">
                        <button
                          type="button"
                          className={`pv-availability-cal__zoom-btn${calendarZoom === 'year' ? ' pv-availability-cal__zoom-btn--on' : ''}`}
                          aria-pressed={calendarZoom === 'year'}
                          onClick={() => setCalendarZoom('year')}
                          disabled={submitting}
                        >
                          Year
                        </button>
                        <button
                          type="button"
                          className={`pv-availability-cal__zoom-btn${calendarZoom === 'month' ? ' pv-availability-cal__zoom-btn--on' : ''}`}
                          aria-pressed={calendarZoom === 'month'}
                          onClick={() => setCalendarZoom('month')}
                          disabled={submitting}
                        >
                          Month
                        </button>
                      </div>
                    </div>

                    {calendarZoom === 'year' ? (
                      <>
                        <div className="pv-cal-nav pv-cal-nav--year">
                          <button
                            type="button"
                            className="pv-cal-nav-btn"
                            onClick={() => shiftViewYear(-1)}
                            aria-label="Previous year"
                            disabled={submitting || !canGoPrevYear(viewMonth.y, earliestMin)}
                          >
                            ‹
                          </button>
                          <span className="pv-cal-month-label">{viewMonth.y}</span>
                          <button
                            type="button"
                            className="pv-cal-nav-btn"
                            onClick={() => shiftViewYear(1)}
                            aria-label="Next year"
                            disabled={submitting}
                          >
                            ›
                          </button>
                        </div>
                        <p className="pv-cal-hint">
                          Tap a <strong>month</strong> to open Month view. Months before{' '}
                          <strong>{formatYmdForDisplay(earliestMin)}</strong> are not available for booking.
                        </p>
                        <div className="pv-availability-cal__year-grid" aria-label="Months in selected year">
                          {MONTH_LABELS_SHORT.map((label, monthIndex) => {
                            const isThisMonth = viewMonth.y === todayYear && monthIndex === todayMonth0
                            const inRange = rangeTouchesMonth(
                              viewMonth.y,
                              monthIndex,
                              form.preferredMoveIn,
                              form.leaseEndDate
                            )
                            const isFocused = viewMonth.m === monthIndex
                            let ringClass = ''
                            if (isThisMonth) ringClass = 'pv-availability-cal__month-tile--current'
                            else if (isFocused) ringClass = 'pv-availability-cal__month-tile--rent-focused'
                            return (
                              <button
                                key={label}
                                type="button"
                                className={[
                                  'pv-availability-cal__month-tile',
                                  'pv-availability-cal__month-tile--rent-pick',
                                  inRange ? 'pv-availability-cal__month-tile--rent-in-range' : '',
                                  ringClass,
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                onClick={() => openMonthFromYear(monthIndex)}
                                disabled={submitting || monthFullyBeforeEarliest(viewMonth.y, monthIndex, earliestMin)}
                              >
                                <span className="pv-availability-cal__month-tile-label">{label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="pv-cal-hint">
                          Bookings start <strong>{formatYmdForDisplay(earliestMin)}</strong> onward (first day of next
                          month). Tap <strong>Move In</strong>, then <strong>Move Out</strong>. A third tap starts a new
                          range.
                        </p>

                        <div className="pv-cal-nav">
                          <button
                            type="button"
                            className="pv-cal-nav-btn"
                            onClick={() => shiftViewMonth(-1)}
                            aria-label="Previous month"
                            disabled={submitting || !canGoPrevMonth(viewMonth.y, viewMonth.m, earliestMin)}
                          >
                            ‹
                          </button>
                          <span className="pv-cal-month-label">{monthTitleLong(viewMonth.y, viewMonth.m)}</span>
                          <button
                            type="button"
                            className="pv-cal-nav-btn"
                            onClick={() => shiftViewMonth(1)}
                            aria-label="Next month"
                            disabled={submitting}
                          >
                            ›
                          </button>
                        </div>

                        <div className="pv-cal-weekdays" aria-hidden="true">
                          {WEEKDAYS_MON.map((w) => (
                            <span key={w} className="pv-cal-weekday">
                              {w}
                            </span>
                          ))}
                        </div>

                        <div className="pv-cal-grid" role="grid" aria-label="Choose rental dates">
                          {calCells.map(({ ymd, label, inMonth }) => {
                            const past = ymd < earliestMin
                            const isStart = ymd === form.preferredMoveIn
                            const isEnd = ymd === form.leaseEndDate
                            const inRangeSel =
                              form.preferredMoveIn &&
                              form.leaseEndDate &&
                              isYmdInRange(ymd, form.preferredMoveIn, form.leaseEndDate) &&
                              !isStart &&
                              !isEnd
                            let cls = 'pv-cal-day'
                            if (!inMonth) cls += ' pv-cal-day--out-month'
                            if (past) cls += ' pv-cal-day--past'
                            if (isStart) cls += ' pv-cal-day--start'
                            if (isEnd) cls += ' pv-cal-day--end'
                            if (inRangeSel) cls += ' pv-cal-day--range'
                            const [yy, mm] = ymd.split('-').map(Number)
                            const ariaMonth = MONTH_NAMES[mm - 1]
                            return (
                              <button
                                key={ymd}
                                type="button"
                                role="gridcell"
                                className={cls}
                                disabled={past || submitting}
                                onClick={() => handleDayPick(ymd)}
                                aria-label={`${label} ${ariaMonth} ${yy}`}
                                aria-pressed={isStart || isEnd}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}

                    <div className="pv-cal-selection-row" aria-live="polite">
                      <div className="pv-cal-selection-dates">
                        <div className="pv-cal-date-block">
                          <span className="pv-cal-date-label">Move In</span>
                          <span className="pv-cal-date-value">{form.preferredMoveIn || '—'}</span>
                        </div>
                        <div className="pv-cal-date-block">
                          <span className="pv-cal-date-label">Move Out</span>
                          <span className="pv-cal-date-value">{form.leaseEndDate || '—'}</span>
                        </div>
                      </div>
                      <div className="pv-cal-selection-duration">
                        <span className="pv-cal-duration-label">Duration</span>
                        <span className="pv-cal-duration-value">
                          {selectionDurationDays != null &&
                          selectionDurationDays >= 1 &&
                          selectionDurationMonths != null ? (
                            <>
                              {selectionDurationDays} day{selectionDurationDays === 1 ? '' : 's'} /{' '}
                              {selectionDurationMonths} month{selectionDurationMonths === 1 ? '' : 's'}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div className="pv-footer">
            <button type="button" className="pv-btn pv-btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="pv-btn pv-btn--primary"
              disabled={submitting || !authChecked || !isStudent || !allAgreementChecked}
            >
              {submitting ? 'Sending…' : 'Submit application'}
            </button>
          </div>
        </form>
      </article>
    </div>
  )
}
