import { useMemo, useState } from 'react'
import { propertyStatusLabel } from '../utils/propertyDisplay'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function normalizeStatus(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked') return 'occupied'
  if (s === 'maintenance') return 'maintenance'
  return 'available'
}

function calendarAnchorMonday(year, month) {
  const first = new Date(year, month, 1)
  const dow = first.getDay()
  const offsetMon0 = (dow + 6) % 7
  const anchor = new Date(first)
  anchor.setDate(first.getDate() - offsetMon0)
  return anchor
}

function monthTitle(year, month) {
  return new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

/** One tile in year overview (listing status + coarse past/future for “available”). */
function getMonthTileKind(year, monthIndex, mode, todayStrip) {
  if (mode === 'occupied') return 'occupied'
  if (mode === 'maintenance') return 'maintenance'
  const last = stripTime(new Date(year, monthIndex + 1, 0))
  if (last < todayStrip) return 'past'
  return 'available'
}

/**
 * Availability calendar: **Year** (compact 12 months) or **Month** (day grid).
 * Shading follows listing {@code status} until per-day data exists.
 */
export default function PropertyAvailabilityCalendar({ status }) {
  const mode = useMemo(() => normalizeStatus(status), [status])
  const statusLabel = propertyStatusLabel(status)

  const [zoom, setZoom] = useState('year')
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })

  const yearTiles = useMemo(() => {
    const todayStrip = stripTime(new Date())
    const now = new Date()
    return MONTH_LABELS.map((label, monthIndex) => {
      const kind = getMonthTileKind(cursor.y, monthIndex, mode, todayStrip)
      const isThisMonth = cursor.y === now.getFullYear() && monthIndex === now.getMonth()
      return { label, monthIndex, kind, isThisMonth }
    })
  }, [cursor.y, mode])

  const cells = useMemo(() => {
    const anchor = calendarAnchorMonday(cursor.y, cursor.m)
    const out = []
    const today = stripTime(new Date())
    for (let i = 0; i < 42; i++) {
      const d = new Date(anchor)
      d.setDate(anchor.getDate() + i)
      const inMonth = d.getMonth() === cursor.m && d.getFullYear() === cursor.y
      const dStrip = stripTime(d)
      const isToday = dStrip.getTime() === today.getTime()
      const isPast = dStrip < today

      let dayKind = 'other'
      if (inMonth) {
        if (mode === 'occupied') dayKind = 'occupied'
        else if (mode === 'maintenance') dayKind = 'maintenance'
        else if (isPast) dayKind = 'past'
        else dayKind = 'available'
      }

      out.push({ date: d, inMonth, isToday, dayKind })
    }
    return out
  }, [cursor.y, cursor.m, mode])

  function prevMonth() {
    setCursor((c) => {
      const nm = c.m === 0 ? 11 : c.m - 1
      const ny = c.m === 0 ? c.y - 1 : c.y
      return { y: ny, m: nm }
    })
  }

  function nextMonth() {
    setCursor((c) => {
      const nm = c.m === 11 ? 0 : c.m + 1
      const ny = c.m === 11 ? c.y + 1 : c.y
      return { y: ny, m: nm }
    })
  }

  function prevYear() {
    setCursor((c) => ({ ...c, y: c.y - 1 }))
  }

  function nextYear() {
    setCursor((c) => ({ ...c, y: c.y + 1 }))
  }

  function openMonth(monthIndex) {
    setCursor((c) => ({ ...c, m: monthIndex }))
    setZoom('month')
  }

  const legend = [
    { key: 'available', label: 'Open' },
    { key: 'occupied', label: 'Occupied / not available' },
    { key: 'maintenance', label: 'Unavailable' },
    { key: 'past', label: 'Past' },
  ]

  return (
    <div className={`pv-availability-cal${zoom === 'year' ? ' pv-availability-cal--year-zoom' : ' pv-availability-cal--month-zoom'}`}>
      <div className="pv-availability-cal__toolbar">
        <div className="pv-availability-cal__zoom-toggle" role="group" aria-label="Calendar scale">
          <button
            type="button"
            className={`pv-availability-cal__zoom-btn${zoom === 'year' ? ' pv-availability-cal__zoom-btn--on' : ''}`}
            aria-pressed={zoom === 'year'}
            onClick={() => setZoom('year')}
          >
            Year
          </button>
          <button
            type="button"
            className={`pv-availability-cal__zoom-btn${zoom === 'month' ? ' pv-availability-cal__zoom-btn--on' : ''}`}
            aria-pressed={zoom === 'month'}
            onClick={() => setZoom('month')}
          >
            Month
          </button>
        </div>
      </div>

      {zoom === 'year' ? (
        <>
          <div className="pv-availability-cal__head">
            <button type="button" className="pv-availability-cal__nav" onClick={prevYear} aria-label="Previous year">
              ‹
            </button>
            <h4 className="pv-availability-cal__title">{cursor.y}</h4>
            <button type="button" className="pv-availability-cal__nav" onClick={nextYear} aria-label="Next year">
              ›
            </button>
          </div>
          <p className="pv-availability-cal__status-line">
            Listing status: <strong>{statusLabel}</strong> — tap a month to open the day view.
          </p>
          <div className="pv-availability-cal__year-grid" aria-label="Availability by month">
            {yearTiles.map(({ label, monthIndex, kind, isThisMonth }) => (
              <button
                key={label}
                type="button"
                className={[
                  'pv-availability-cal__month-tile',
                  `pv-availability-cal__month-tile--${kind}`,
                  isThisMonth ? 'pv-availability-cal__month-tile--current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => openMonth(monthIndex)}
              >
                <span className="pv-availability-cal__month-tile-label">{label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="pv-availability-cal__head">
            <button type="button" className="pv-availability-cal__nav" onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <h4 className="pv-availability-cal__title">{monthTitle(cursor.y, cursor.m)}</h4>
            <button type="button" className="pv-availability-cal__nav" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>
          <p className="pv-availability-cal__status-line">
            Listing status: <strong>{statusLabel}</strong>
          </p>
          <div className="pv-availability-cal__grid" aria-label="Availability by day">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pv-availability-cal__dow">
                {w}
              </div>
            ))}
            {cells.map(({ date, inMonth, isToday, dayKind }) => (
              <div
                key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                className={[
                  'pv-availability-cal__cell',
                  inMonth ? 'pv-availability-cal__cell--in-month' : 'pv-availability-cal__cell--out',
                  `pv-availability-cal__cell--${dayKind}`,
                  isToday ? 'pv-availability-cal__cell--today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${date.toDateString()}, ${dayKind}`}
              >
                <span className="pv-availability-cal__num">{date.getDate()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <ul className="pv-availability-cal__legend" aria-label="Legend">
        {legend.map(({ key, label }) => (
          <li key={key}>
            <span className={`pv-availability-cal__swatch pv-availability-cal__swatch--${key}`} aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <p className="pv-availability-cal__hint">
        Shading follows this listing&apos;s status only. Exact move-in dates are not stored here yet — check with the
        landlord to confirm.
      </p>
    </div>
  )
}
