import { formatDateShort, monthOverlapsLease, parseLeaseRange } from './rentCalendarUtils'

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_FULL = [
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

export function formatRm(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getDueDate(year, month1to12) {
  return new Date(year, month1to12, 1)
}

export function isMonthOverdue(year, month1to12, leaseRange, paid, unavailable) {
  if (!leaseRange || paid || unavailable) return false
  if (!monthOverlapsLease(year, month1to12, leaseRange)) return false
  const due = getDueDate(year, month1to12)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

export function iterLeaseMonths(leaseRange) {
  if (!leaseRange) return []
  const items = []
  let y = leaseRange.moveIn.getFullYear()
  let m = leaseRange.moveIn.getMonth() + 1
  const endY = leaseRange.moveOut.getFullYear()
  const endM = leaseRange.moveOut.getMonth() + 1

  while (y < endY || (y === endY && m <= endM)) {
    if (monthOverlapsLease(y, m, leaseRange)) {
      items.push({ year: y, month: m })
    }
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return items
}

export function buildMonthCell({ year, month, leaseRange, paidMonths, recordByMonth }) {
  const inLease = monthOverlapsLease(year, month, leaseRange)
  const rec = recordByMonth.get(month)
  const unavailable = rec?.monthState === 'unavailable'
  const paid = paidMonths.includes(month) && !unavailable
  const overdue = isMonthOverdue(year, month, leaseRange, paid, unavailable)

  let status = 'outside'
  if (inLease) {
    if (paid) status = 'paid'
    else if (unavailable) status = 'unavailable'
    else if (overdue) status = 'overdue'
    else status = 'pending'
  }

  return {
    month,
    label: MONTH_SHORT[month - 1],
    fullLabel: `${MONTH_FULL[month - 1]} ${year}`,
    inLease,
    paid,
    unavailable,
    overdue,
    status,
    record: rec || null,
    amount: rec?.amount != null ? Number(rec.amount) : null,
  }
}

export function computeRentTotals({ leaseRange, monthlyRent, recordsByYearMonth }) {
  const rent = Number(monthlyRent)
  const defaultAmount = Number.isFinite(rent) && rent > 0 ? rent : 0
  let totalPaid = 0
  let totalPending = 0

  for (const { year, month } of iterLeaseMonths(leaseRange)) {
    const key = `${year}-${month}`
    const rec = recordsByYearMonth.get(key)
    const unavailable = rec?.monthState === 'unavailable'
    const paid = rec && rec.monthState !== 'unavailable'
    const amount =
      rec?.amount != null && Number.isFinite(Number(rec.amount)) && Number(rec.amount) > 0
        ? Number(rec.amount)
        : defaultAmount

    if (unavailable) continue
    if (paid) totalPaid += amount
    else totalPending += amount
  }

  return { totalPaid, totalPending }
}

export function tenancyPeriodLabel(leaseRange) {
  if (!leaseRange) return '—'
  return `${formatDateShort(leaseRange.moveIn)} → ${formatDateShort(leaseRange.moveOut)}`
}

export { parseLeaseRange, formatDateShort, monthOverlapsLease }
