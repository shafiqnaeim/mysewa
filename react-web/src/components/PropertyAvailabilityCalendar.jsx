import { useMemo, useState } from 'react'
import { dateToYMD } from '../utils/bookingDates'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function normalizeListingStatus(status) {
  const s = String(status || 'available').toLowerCase()
  if (s === 'rented' || s === 'booked' || s === 'occupied') return 'occupied'
  if (s === 'maintenance' || s === 'unavailable') return 'unavailable'
  return 'available'
}

function calendarAnchorMonday(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const anchor = new Date(first)
  anchor.setDate(first.getDate() - offset)
  return anchor
}

function monthTitle(year, month) {
  return new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

/** Mock per-day availability — all future days available unless listing status overrides. */
function getDayAvailability(date, inMonth, listingMode, today) {
  if (!inMonth) return 'other'

  const day = stripTime(date)
  if (day < today) return 'past'

  if (listingMode === 'occupied') return 'occupied'
  if (listingMode === 'unavailable') return 'unavailable'

  return 'available'
}

const DAY_CELL_CLASS = {
  available:
    'border-green-200 bg-green-100 text-green-800 hover:bg-green-200 focus-visible:ring-[#E88D5B]',
  occupied: 'border-red-200 bg-red-100 text-red-800 hover:bg-red-200 focus-visible:ring-[#E88D5B]',
  unavailable:
    'border-[#CBD5E0] bg-[#E2E8F0] text-[#718096] hover:bg-[#CBD5E0] focus-visible:ring-[#E88D5B]',
  past: 'border-[#EDF2F7] bg-[#F7FAFC] text-[#A0AEC0] cursor-default',
  other: 'border-transparent bg-transparent text-[#E2E8F0] pointer-events-none',
}

const LEGEND = [
  { key: 'available', label: 'Available', className: 'bg-green-100 border-green-200' },
  { key: 'occupied', label: 'Occupied', className: 'bg-red-100 border-red-200' },
  { key: 'unavailable', label: 'Unavailable', className: 'bg-[#E2E8F0] border-[#CBD5E0]' },
  { key: 'past', label: 'Past', className: 'bg-[#F7FAFC] border-[#EDF2F7]' },
]

export default function PropertyAvailabilityCalendar({
  status,
  onDaySelect,
  moveInYmd = '',
  moveOutYmd = '',
  hideFooterNote = false,
}) {
  const listingMode = useMemo(() => normalizeListingStatus(status), [status])

  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const [selectedDate, setSelectedDate] = useState(() => stripTime(new Date()))

  const today = useMemo(() => stripTime(new Date()), [])

  const cells = useMemo(() => {
    const anchor = calendarAnchorMonday(cursor.year, cursor.month)
    const out = []

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(anchor)
      date.setDate(anchor.getDate() + i)
      const inMonth = date.getMonth() === cursor.month && date.getFullYear() === cursor.year
      const dayKey = getDayAvailability(date, inMonth, listingMode, today)
      const isToday = stripTime(date).getTime() === today.getTime()
      const ymd = dateToYMD(stripTime(date))
      const inLeaseRange =
        moveInYmd &&
        moveOutYmd &&
        ymd >= moveInYmd &&
        ymd <= moveOutYmd
      const isMoveIn = moveInYmd && ymd === moveInYmd
      const isMoveOut = moveOutYmd && ymd === moveOutYmd
      const isSelected =
        (onDaySelect && (isMoveIn || isMoveOut)) ||
        (!onDaySelect && stripTime(date).getTime() === selectedDate.getTime())

      out.push({ date, inMonth, dayKey, isToday, isSelected, ymd, inLeaseRange, isMoveIn, isMoveOut })
    }

    return out
  }, [cursor.year, cursor.month, listingMode, today, selectedDate, onDaySelect, moveInYmd, moveOutYmd])

  function prevMonth() {
    setCursor((current) => {
      const month = current.month === 0 ? 11 : current.month - 1
      const year = current.month === 0 ? current.year - 1 : current.year
      return { year, month }
    })
  }

  function nextMonth() {
    setCursor((current) => {
      const month = current.month === 11 ? 0 : current.month + 1
      const year = current.month === 11 ? current.year + 1 : current.year
      return { year, month }
    })
  }

  function handleDayClick(cell) {
    if (!cell.inMonth || cell.dayKey === 'past') return
    if (onDaySelect) {
      onDaySelect(cell.ymd)
      return
    }
    setSelectedDate(stripTime(cell.date))
  }

  const selectedLabel = onDaySelect
    ? [
        moveInYmd ? `Move-in: ${moveInYmd}` : null,
        moveOutYmd ? `Move-out: ${moveOutYmd}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Click a date to set move-in, then move-out'
    : selectedDate.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-3 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#EDF2F7]"
          aria-label="Previous month"
        >
          ← Prev
        </button>
        <h3 className="text-center text-lg font-bold text-[#2D3748]">
          {monthTitle(cursor.year, cursor.month)}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-3 py-2 text-sm font-semibold text-[#2D3748] transition hover:bg-[#EDF2F7]"
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Availability calendar">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]"
          >
            {label}
          </div>
        ))}

        {cells.map((cell) => {
          const clickable = cell.inMonth && cell.dayKey !== 'past' && cell.dayKey !== 'other'
          return (
            <button
              key={`${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`}
              type="button"
              disabled={!clickable}
              onClick={() => handleDayClick(cell)}
              className={[
                'flex h-9 items-center justify-center rounded-lg border text-sm font-medium transition sm:h-10',
                DAY_CELL_CLASS[cell.dayKey] || DAY_CELL_CLASS.other,
                cell.inLeaseRange && cell.dayKey === 'available' ? 'bg-[#F3F0FF] border-[#6C2BD9]/30' : '',
                cell.isToday ? 'ring-2 ring-[#F59E0B] ring-offset-1' : '',
                cell.isSelected && clickable ? 'ring-2 ring-[#6C2BD9] ring-offset-1 font-bold' : '',
                cell.isMoveIn || cell.isMoveOut ? 'bg-[#6C2BD9] text-white border-[#6C2BD9]' : '',
                clickable ? 'cursor-pointer' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${cell.date.toDateString()}, ${cell.dayKey}`}
              aria-pressed={cell.isSelected}
            >
              {cell.date.getDate()}
            </button>
          )
        })}
      </div>

      <ul className="mt-5 flex flex-wrap gap-3 text-xs text-[#4A5568]" aria-label="Calendar legend">
        {LEGEND.map((item) => (
          <li key={item.key} className="inline-flex items-center gap-2">
            <span className={`h-3.5 w-3.5 rounded border ${item.className}`} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F7FAFC] px-4 py-3 text-sm text-[#4A5568]">
        <span className="font-semibold text-[#2D3748]">Selected: </span>
        {selectedLabel}
      </p>

      {hideFooterNote ? null : (
        <p className="mt-3 text-xs text-[#A0AEC0]">
          Showing mock availability (all open days marked available). Per-day booking data can be wired later.
        </p>
      )}
    </div>
  )
}
