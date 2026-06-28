export const AVG_DAYS_PER_MONTH = 365.25 / 12

/** First day of the next calendar month — earliest move-in. */
export function earliestBookYMD() {
  const t = new Date()
  const firstNext = new Date(t.getFullYear(), t.getMonth() + 1, 1)
  const z = (n) => String(n).padStart(2, '0')
  return `${firstNext.getFullYear()}-${z(firstNext.getMonth() + 1)}-${z(firstNext.getDate())}`
}

export function parseYMD(s) {
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return dt
}

export function formatYmdForDisplay(ymd) {
  const p = parseYMD(ymd)
  if (!p) return ymd
  return p.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function addDaysYMD(ymd, deltaDays) {
  const d = parseYMD(ymd)
  if (!d) return ''
  d.setDate(d.getDate() + deltaDays)
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export function dateToYMD(date) {
  const z = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`
}

export function leaseSpanDays(moveIn, leaseEnd) {
  const a = parseYMD(moveIn)
  const b = parseYMD(leaseEnd)
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function leaseMonthsFromDates(moveIn, leaseEnd) {
  const days = leaseSpanDays(moveIn, leaseEnd)
  if (days == null || days < 1) return null
  return Math.min(120, Math.max(1, Math.round(days / AVG_DAYS_PER_MONTH)))
}

export function estimateTotalPrice(monthlyPrice, moveIn, leaseEnd) {
  const price = Number(monthlyPrice)
  const days = leaseSpanDays(moveIn, leaseEnd)
  if (!Number.isFinite(price) || price <= 0 || days == null || days < 1) return null
  return Math.round((price / 30) * days)
}

/** Pick move-in / move-out from calendar clicks (same rules as apply modal). */
export function pickLeaseDates(currentMoveIn, currentMoveOut, pickedYmd, earliestYmd = earliestBookYMD()) {
  if (pickedYmd < earliestYmd) return { moveIn: currentMoveIn, moveOut: currentMoveOut }

  if (!currentMoveIn) {
    return { moveIn: pickedYmd, moveOut: '' }
  }
  if (!currentMoveOut) {
    if (pickedYmd <= currentMoveIn) {
      return { moveIn: pickedYmd, moveOut: '' }
    }
    const maxEnd = addDaysYMD(currentMoveIn, 365 * 10 + 1)
    if (pickedYmd > maxEnd) return { moveIn: currentMoveIn, moveOut: currentMoveOut }
    return { moveIn: currentMoveIn, moveOut: pickedYmd }
  }
  return { moveIn: pickedYmd, moveOut: '' }
}
